-- =============================================
-- Cabana Koordinat ve Bar Pozisyon Import Script
-- Kullanım: psql -U <user> -d <db> -f import_coords.sql
-- =============================================

BEGIN;

-- ===== CABANA KOORDİNATLARI =====
UPDATE cabanas SET "coordX" = 505.27585882947153, "coordY" = 463.6112678786941, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-15';
UPDATE cabanas SET "coordX" = 523.1643236448481, "coordY" = 433.38561389615273, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-14';
UPDATE cabanas SET "coordX" = 525.7021426549742, "coordY" = 551.6584472979919, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-11';
UPDATE cabanas SET "coordX" = 846.9871714590925, "coordY" = 432.73275194053446, rotation = 0, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-16';
UPDATE cabanas SET "coordX" = 991.5704097633761, "coordY" = 600.499465975257, rotation = 0, "scaleX" = 1.7, "scaleY" = 2.3 WHERE name = 'Kabana-22';
UPDATE cabanas SET "coordX" = 846.0759323244706, "coordY" = 501.70428259636503, rotation = 0, "scaleX" = 1.7, "scaleY" = 1.3 WHERE name = 'Kabana-18';
UPDATE cabanas SET "coordX" = 376.97789351402736, "coordY" = 442.07400801967987, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-07';
UPDATE cabanas SET "coordX" = 359.14155549372435, "coordY" = 473.10113252054384, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-08';
UPDATE cabanas SET "coordX" = 510.3138885552062, "coordY" = 582.2531686512906, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-10';
UPDATE cabanas SET "coordX" = 412.68839289767476, "coordY" = 263.75333740448184, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-02';
UPDATE cabanas SET "coordX" = 372.49688406431335, "coordY" = 242.26957959572553, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-03';
UPDATE cabanas SET "coordX" = 578.5344617518988, "coordY" = 204.09596618358972, rotation = 0, "scaleX" = 1.4, "scaleY" = 1.5 WHERE name = 'VIP Kabana-27';
UPDATE cabanas SET "coordX" = 470.66332236065864, "coordY" = 371.3293464046155, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-04';
UPDATE cabanas SET "coordX" = 787.7888170956081, "coordY" = 546.0924451008589, rotation = 0, "scaleX" = 1.7, "scaleY" = 2.4 WHERE name = 'Kabana-19';
UPDATE cabanas SET "coordX" = 343.3982747381765, "coordY" = 502.22434344778486, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-09';
UPDATE cabanas SET "coordX" = 455.82558563261364, "coordY" = 400.8298302424108, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-05';
UPDATE cabanas SET "coordX" = 935.0333678552338, "coordY" = 466.70544928881435, rotation = 0, "scaleX" = 1.8, "scaleY" = 1.5 WHERE name = 'Kabana-24';
UPDATE cabanas SET "coordX" = 438.52303353604316, "coordY" = 430.50234817876134, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-06';
UPDATE cabanas SET "coordX" = 538.982332633328, "coordY" = 403.1687150818666, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-13';
UPDATE cabanas SET "coordX" = 935.3567471376261, "coordY" = 502.0329275958484, rotation = 0, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-23';
UPDATE cabanas SET "coordX" = 539.0822574984783, "coordY" = 202.38581504130184, rotation = 0, "scaleX" = 1.3, "scaleY" = 1.5 WHERE name = 'VIP Kabana-26';
UPDATE cabanas SET "coordX" = 454.0542911452915, "coordY" = 282.7571789543597, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-01';
UPDATE cabanas SET "coordX" = 787.7173158818032, "coordY" = 597.0822814080436, rotation = 0, "scaleX" = 1.8, "scaleY" = 2.3 WHERE name = 'Kabana-20';
UPDATE cabanas SET "coordX" = 933.5657646669313, "coordY" = 432.0588173157635, rotation = 0, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-25';
UPDATE cabanas SET "coordX" = 541.2373152918119, "coordY" = 520.281343872019, rotation = 150, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-12';
UPDATE cabanas SET "coordX" = 992.2620484153547, "coordY" = 548.0394511825886, rotation = 0, "scaleX" = 1.9, "scaleY" = 2.2 WHERE name = 'Kabana-21';
UPDATE cabanas SET "coordX" = 845.9289330786726, "coordY" = 468.42467709779896, rotation = 0, "scaleX" = 1.7, "scaleY" = 1.5 WHERE name = 'Kabana-17';

-- ===== BAR POZİSYONLARI =====
INSERT INTO system_configs (id, key, value, "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'blue_sea_bar_transform',
  '{"x":320.35105537739713,"y":191.0461987530526,"scale":1,"rotation":10,"isLocked":true}',
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  "updatedAt" = NOW();

INSERT INTO system_configs (id, key, value, "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'sunset_bar_transform',
  '{"x":873.2422646501897,"y":326.5168173196316,"scale":1,"rotation":0,"isLocked":true}',
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  "updatedAt" = NOW();

INSERT INTO system_configs (id, key, value, "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'common_parasol_transform',
  '{"x":620,"y":420,"scale":1,"rotation":0,"isLocked":false}',
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  "updatedAt" = NOW();

-- Sonuç kontrolü
SELECT name, "coordX", "coordY", rotation, "scaleX", "scaleY" FROM cabanas ORDER BY name;
SELECT key, value FROM system_configs WHERE key IN ('blue_sea_bar_transform', 'sunset_bar_transform');

COMMIT;
