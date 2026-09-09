#!/usr/bin/env python3
"""
Script de Deploy FTP Automatizado para a Plataforma Municipal de Cultura de Água Boa
Servidor: 187.110.165.199:21
Usuário: cultura@cultura.aguaboa.mt.gov.br
"""

import os
import sys
import ftplib
import subprocess
from pathlib import Path

FTP_HOST = os.getenv('FTP_HOST', '187.110.165.199')
FTP_PORT = int(os.getenv('FTP_PORT', '21'))
FTP_USER = os.getenv('FTP_USER', 'cultura@cultura.aguaboa.mt.gov.br')
FTP_PASS = os.getenv('FTP_PASS', 'X@%JtMIGvk6M%m')

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = PROJECT_ROOT / 'dist'

def run_build():
    print("🔨 [1/3] Executando build de produção (npm run build)...")
    result = subprocess.run(['npm', 'run', 'build'], cwd=PROJECT_ROOT)
    if result.returncode != 0:
        print("❌ Erro durante o build! Abortando deploy.")
        sys.exit(1)
    print("✅ Build concluído com sucesso!\n")

def connect_ftp():
    print(f"📡 [2/3] Conectando ao servidor FTP ({FTP_HOST}:{FTP_PORT})...")
    # Tenta primeiro FTPS (TLS); caso o servidor não suporte TLS, faz fallback para FTP padrão
    try:
        ftp = ftplib.FTP_TLS()
        ftp.connect(FTP_HOST, FTP_PORT, timeout=30)
        ftp.auth()
        ftp.login(FTP_USER, FTP_PASS)
        ftp.prot_p()
        print("🔐 Conexão FTPS (TLS seguro) estabelecida com sucesso!")
        return ftp
    except Exception as e:
        # Fallback para FTP padrão
        try:
            ftp = ftplib.FTP()
            ftp.connect(FTP_HOST, FTP_PORT, timeout=30)
            ftp.login(FTP_USER, FTP_PASS)
            print("🌐 Conexão FTP padrão estabelecida com sucesso!")
            return ftp
        except Exception as err:
            print(f"❌ Falha ao conectar ao servidor FTP: {err}")
            sys.exit(1)

def ensure_remote_dir(ftp, remote_path):
    """Garante que a pasta remota exista no servidor FTP."""
    parts = [p for p in remote_path.strip('/').split('/') if p]
    current = '/'
    for part in parts:
        current = f"{current.rstrip('/')}/{part}"
        try:
            ftp.cwd(current)
        except ftplib.error_perm:
            try:
                ftp.mkd(current)
                ftp.cwd(current)
            except Exception:
                pass

def upload_directory(ftp, local_dir, remote_base='/'):
    print(f"🚀 [3/3] Enviando arquivos de '{local_dir}' para o servidor FTP...")
    total_files = 0
    total_bytes = 0

    # Coletar arquivos para upload
    all_files = []
    for root, dirs, files in os.walk(local_dir):
        for file in files:
            local_file_path = Path(root) / file
            rel_path = local_file_path.relative_to(local_dir)
            all_files.append((local_file_path, rel_path))

    total = len(all_files)
    print(f"📦 Total de arquivos a enviar: {total}\n")

    for i, (local_path, rel_path) in enumerate(all_files, 1):
        rel_parts = list(rel_path.parts)
        filename = rel_parts[-1]
        subdirs = rel_parts[:-1]

        remote_dir = '/' + '/'.join(subdirs) if subdirs else '/'
        ensure_remote_dir(ftp, remote_dir)

        file_size = local_path.stat().st_size
        size_str = f"{file_size / 1024:.1f} KB" if file_size < 1024 * 1024 else f"{file_size / (1024 * 1024):.2f} MB"

        print(f"[{i}/{total}] Enviando: {rel_path} ({size_str})...", end='', flush=True)

        with open(local_path, 'rb') as f:
            ftp.storbinary(f"STOR {filename}", f)

        print(" ✔ OK")
        total_files += 1
        total_bytes += file_size

    total_mb = total_bytes / (1024 * 1024)
    print(f"\n✨ Deploy finalizado com sucesso!")
    print(f"📊 {total_files} arquivos enviados ({total_mb:.2f} MB transferidos).")
    print(f"🌐 Site atualizado em: https://cultura.aguaboa.mt.gov.br\n")

def main():
    skip_build = '--no-build' in sys.argv

    if not skip_build:
        run_build()
    else:
        print("⏩ Pulando etapa de build (--no-build detectado).")

    if not DIST_DIR.exists() or not (DIST_DIR / 'index.html').exists():
        print("❌ Pasta 'dist/' não encontrada ou sem index.html! Execute o build primeiro.")
        sys.exit(1)

    ftp = connect_ftp()
    try:
        upload_directory(ftp, DIST_DIR)
    finally:
        try:
            ftp.quit()
        except Exception:
            pass

if __name__ == '__main__':
    main()
