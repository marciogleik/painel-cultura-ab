-- Add academic_year to workshop_enrollments
ALTER TABLE workshop_enrollments 
ADD COLUMN IF NOT EXISTS academic_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Update existing records to their enrollment_date year if they exist
UPDATE workshop_enrollments 
SET academic_year = EXTRACT(YEAR FROM enrollment_date)
WHERE academic_year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Create secure RPC function to fetch previous enrollment
CREATE OR REPLACE FUNCTION find_my_enrollment(p_student_name text, p_phone text)
RETURNS SETOF workshop_enrollments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM workshop_enrollments
  WHERE TRIM(LOWER(student_name)) = TRIM(LOWER(p_student_name))
    AND REGEXP_REPLACE(phone, '\D', '', 'g') = REGEXP_REPLACE(p_phone, '\D', '', 'g')
  ORDER BY enrollment_date DESC
  LIMIT 1;
END;
$$;
