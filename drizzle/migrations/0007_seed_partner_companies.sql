-- 0007_seed_partner_companies.sql
-- Seed standard partner institutions (Altocom, Midian, iTech, Catech)

INSERT INTO public.institutions (name, code, contact_email, phone_number, description, address, status)
VALUES
  (
    'Altocom Engineering & Tech Institute',
    'ALTOCOM',
    'admissions@altocom.co.ke',
    '+254 711 000 111',
    'Specialized engineering, industrial automation, telecommunications, and high-performance cloud networks.',
    'Altocom Tech Park, Waiyaki Way, Nairobi',
    'active'
  ),
  (
    'Midian Business & Digital Academy',
    'MIDIAN',
    'info@midian.co.ke',
    '+254 722 000 222',
    'Executive fintech leadership, product management, financial engineering, and enterprise strategy.',
    'Midian Financial Centre, Upper Hill, Nairobi',
    'active'
  ),
  (
    'iTech Software Development Academy',
    'ITECH',
    'enroll@itech.co.ke',
    '+254 733 000 333',
    'Full-stack web engineering, cloud-native DevOps, TypeScript, mobile apps, and microservice architectures.',
    'iTech Innovation Campus, Kilimani, Nairobi',
    'active'
  ),
  (
    'Catech Higher Learning & Research Hub',
    'CATECH',
    'info@catech.co.ke',
    '+254 700 000 444',
    'Accredited computer science, applied machine learning, cybersecurity, and modern technical curriculum.',
    'Catech Science Park, Ngong Road, Nairobi',
    'active'
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  contact_email = EXCLUDED.contact_email,
  phone_number = EXCLUDED.phone_number,
  description = EXCLUDED.description,
  address = EXCLUDED.address,
  status = 'active',
  updated_at = now();
