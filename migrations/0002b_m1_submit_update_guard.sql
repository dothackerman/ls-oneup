CREATE TRIGGER probes_submitted_update_guard
BEFORE UPDATE ON probes
FOR EACH ROW
WHEN NEW.submitted_at IS NOT NULL
BEGIN
  SELECT CASE
    WHEN length(trim(COALESCE(NEW.crop_name, ''))) = 0
    THEN RAISE(ABORT, 'submitted probe requires crop_name')
  END;

  SELECT CASE
    WHEN NEW.plant_vitality IS NULL
      OR NEW.plant_vitality NOT IN (
        'normal',
        'schwach_langsam',
        'krankheit_oder_anderes_problem'
      )
    THEN RAISE(ABORT, 'submitted probe has invalid plant_vitality')
  END;

  SELECT CASE
    WHEN NEW.soil_moisture IS NULL
      OR NEW.soil_moisture NOT IN (
        'sehr_trocken',
        'trocken',
        'normal',
        'nass',
        'sehr_nass'
      )
    THEN RAISE(ABORT, 'submitted probe has invalid soil_moisture')
  END;

  SELECT CASE
    WHEN NEW.gps_lat IS NULL OR NEW.gps_lat < -90 OR NEW.gps_lat > 90
    THEN RAISE(ABORT, 'submitted probe has invalid gps_lat')
  END;

  SELECT CASE
    WHEN NEW.gps_lon IS NULL OR NEW.gps_lon < -180 OR NEW.gps_lon > 180
    THEN RAISE(ABORT, 'submitted probe has invalid gps_lon')
  END;

  SELECT CASE
    WHEN length(trim(COALESCE(NEW.gps_captured_at, ''))) = 0
    THEN RAISE(ABORT, 'submitted probe requires gps_captured_at')
  END;

  SELECT CASE
    WHEN length(trim(COALESCE(NEW.image_key, ''))) = 0
    THEN RAISE(ABORT, 'submitted probe requires image_key')
  END;

  SELECT CASE
    WHEN NEW.image_mime IS NULL
      OR NEW.image_mime NOT IN ('image/jpeg', 'image/png')
    THEN RAISE(ABORT, 'submitted probe has invalid image_mime')
  END;

  SELECT CASE
    WHEN NEW.image_bytes IS NULL OR NEW.image_bytes <= 0 OR NEW.image_bytes > 2097152
    THEN RAISE(ABORT, 'submitted probe has invalid image_bytes')
  END;

  SELECT CASE
    WHEN length(trim(COALESCE(NEW.image_uploaded_at, ''))) = 0
    THEN RAISE(ABORT, 'submitted probe requires image_uploaded_at')
  END;
END
