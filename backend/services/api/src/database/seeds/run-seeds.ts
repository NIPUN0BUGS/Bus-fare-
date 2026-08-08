import 'reflect-metadata';
import AppDataSource from '../data-source';

// Fixed UUIDs so re-seeding is idempotent
const ROUTE_594_ID  = 'a1b2c3d4-0000-0000-0000-000000000594';
const ROUTE_590_ID  = 'a1b2c3d4-0000-0000-0000-000000000590';

async function runSeeds() {
  await AppDataSource.initialize();
  console.warn('Running seeds...');

  // ── Provinces ─────────────────────────────────────────────────────────────
  await AppDataSource.query(`
    INSERT INTO provinces (id, name, name_si, name_ta) VALUES
      (1, 'Western',       'බස්නාහිර',        'மேல்'),
      (2, 'Central',       'මධ්‍යම',           'மத்திய'),
      (3, 'Southern',      'දකුණ',             'தெற்கு'),
      (4, 'Northern',      'උතුර',             'வடக்கு'),
      (5, 'Eastern',       'නැගෙනහිර',        'கிழக்கு'),
      (6, 'North Western', 'උතුරු බස්නාහිර',   'வடமேல்'),
      (7, 'North Central', 'උතුරු මධ්‍යම',     'வட மத்திய'),
      (8, 'Uva',           'ඌව',               'ஊவா'),
      (9, 'Sabaragamuwa',  'සබරගමුව',          'சபரகாமுவா')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Districts ─────────────────────────────────────────────────────────────
  await AppDataSource.query(`
    INSERT INTO districts (id, province_id, name, name_si, name_ta) VALUES
      (11, 1, 'Colombo',       'කොළඹ',       'கொழும்பு'),
      (12, 1, 'Gampaha',       'ගම්පහ',      'கம்பஹா'),
      (13, 1, 'Kalutara',      'කළුතර',      'களுத்துறை'),
      (21, 2, 'Kandy',         'මහනුවර',     'கண்டி'),
      (22, 2, 'Matale',        'මාතලේ',      'மாத்தளை'),
      (23, 2, 'Nuwara Eliya',  'නුවරඑළිය',   'நுவர எலியா'),
      (31, 3, 'Galle',         'ගාල්ල',      'காலி'),
      (32, 3, 'Matara',        'මාතර',       'மாத்தறை'),
      (33, 3, 'Hambantota',    'හම්බන්තොට',  'அம்பாந்தோட்டை'),
      (41, 4, 'Jaffna',        'යාපනය',      'யாழ்ப்பாணம்'),
      (51, 5, 'Ampara',        'අම්පාර',     'அம்பாறை'),
      (61, 6, 'Kurunegala',    'කුරුණෑගල',   'குருணாகல்'),
      (71, 7, 'Anuradhapura',  'අනුරාධපුරය', 'அனுராதபுரம்'),
      (81, 8, 'Badulla',       'බදුල්ල',     'பதுலை'),
      (91, 9, 'Ratnapura',     'රත්නපුර',    'இரத்தினபுரி')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Bus Stops ─────────────────────────────────────────────────────────────
  await AppDataSource.query(`
    INSERT INTO bus_stops (stop_code, name, name_si, name_ta, district_id, lat, lng, is_terminus, status)
    VALUES
      ('CMB-FORT-01',  'Colombo Fort Bus Stand',           'කොළඹ ෆෝට් බස් නැවතුම',    'கொழும்பு கோட்டை',               11, 6.9341, 79.8428, TRUE,  'ACTIVE'),
      ('COL-NUG-01',   'Nugegoda',                         'නුගේගොඩ',                   'நுகேகோடா',                      11, 6.8730, 79.8975, FALSE, 'ACTIVE'),
      ('COL-BOR-01',   'Borella',                          'බොරැල්ල',                   'பொறல்ல',                        11, 6.9103, 79.8698, FALSE, 'ACTIVE'),
      ('COL-MAH-01',   'Maharagama',                       'මහරගම',                     'மகரகம',                         11, 6.8492, 79.9260, FALSE, 'ACTIVE'),
      ('KAN-GAM-01',   'Gampola',                          'ගම්පොල',                    'கம்போலா',                       21, 7.1638, 80.5739, TRUE,  'ACTIVE'),
      ('KAN-HIN-01',   'Hindagala',                        'හිඳගල',                     'இந்தகல',                        21, 7.2160, 80.5970, FALSE, 'ACTIVE'),
      ('KAN-TEN-01',   'Tennekumbura',                     'තෙන්නේකුඹුර',               'தென்னேகும்புர',                 21, 7.2500, 80.6050, FALSE, 'ACTIVE'),
      ('KAN-PIL-01',   'Pilimathalawa',                    'පිලිමතලාව',                 'பிலிமத்தலாவ',                   21, 7.2644, 80.5739, FALSE, 'ACTIVE'),
      ('KAN-PER-01',   'Peradeniya Junction',              'පේරාදෙණිය හන්දිය',          'பேராதனி சந்தி',                 21, 7.2676, 80.5963, FALSE, 'ACTIVE'),
      ('KAN-PERBG-01', 'Peradeniya Botanical Gardens',     'පේරාදෙණිය උද්භිද උද්‍යානය', 'பேராதனி தாவரவியல் பூங்கா',     21, 7.2680, 80.5942, FALSE, 'ACTIVE'),
      ('KAN-UNI-01',   'University of Peradeniya',         'පේරාදෙණිය විශ්වවිද්‍යාලය',  'பேராதனி பல்கலைக்கழகம்',        21, 7.2540, 80.5915, FALSE, 'ACTIVE'),
      ('KAN-GET-01',   'Getambe',                          'ගෙතඹේ',                     'கெட்டம்பே',                     21, 7.2715, 80.6172, FALSE, 'ACTIVE'),
      ('KAN-BOG-01',   'Bogambara',                        'බොගම්බර',                   'போகம்பற',                       21, 7.2855, 80.6337, FALSE, 'ACTIVE'),
      ('KAN-CLOCK-01', 'Kandy Clock Tower',                'කන්ඩි ඔරලෝසු කුළුණ',       'கண்டி கடிகார கோபுரம்',          21, 7.2906, 80.6337, FALSE, 'ACTIVE'),
      ('KAN-RAIL-01',  'Kandy Railway Station',            'කන්ඩි දුම්රිය ස්ථානය',      'கண்டி இரயில் நிலையம்',          21, 7.2931, 80.6353, FALSE, 'ACTIVE'),
      ('KAN-CITY-01',  'Kandy City Centre Bus Stand',      'කන්ඩි නගර බස් නැවතුම',     'கண்டி நகர பேருந்து நிலையம்',   21, 7.2936, 80.6350, TRUE,  'ACTIVE'),
      ('KAN-DALADA-01','Temple of the Tooth Junction',     'දළදා මාළිගා හන්දිය',        'பல் கோவில் சந்தி',              21, 7.2935, 80.6413, FALSE, 'ACTIVE'),
      ('KAN-ASG-01',   'Asgiriya',                         'අස්ගිරිය',                  'அஸ்கிரியா',                     21, 7.3024, 80.6303, FALSE, 'ACTIVE'),
      ('KAN-DHAR-01',  'Dharmaraja Junction',              'ධර්මරාජ හන්දිය',            'தர்மராஜா சந்தி',                21, 7.2946, 80.6364, FALSE, 'ACTIVE'),
      ('KAN-KAT-01',   'Katugastota',                      'කටුගස්තොට',                 'கட்டுகஸ்தோட்டா',               21, 7.3248, 80.6254, FALSE, 'ACTIVE'),
      ('KAN-LEW-01',   'Lewella',                          'ලෙවෙල්ල',                   'லேவெல்லா',                      21, 7.3080, 80.6511, FALSE, 'ACTIVE'),
      ('KAN-KUN-01',   'Kundasale',                        'කුණ්ඩසාලේ',                 'குண்டசாலே',                     21, 7.2980, 80.6640, FALSE, 'ACTIVE'),
      ('KAN-AMP-01',   'Ampitiya',                         'අඹිතියාව',                  'அம்பிட்டியா',                   21, 7.2824, 80.6615, FALSE, 'ACTIVE'),
      ('KAN-DIG-01',   'Digana',                           'දිගන',                      'டிகானா',                        21, 7.3071, 80.7219, FALSE, 'ACTIVE'),
      ('KAN-WAT-01',   'Wattegama',                        'වත්තේගම',                   'வட்டேகாமா',                     21, 7.3532, 80.6843, FALSE, 'ACTIVE'),
      ('GAL-CITY-01',  'Galle Bus Stand',                  'ගාල්ල බස් නැවතුම',          'காலி பேருந்து நிலையம்',         31, 6.0326, 80.2170, TRUE,  'ACTIVE'),
      ('JAF-CITY-01',  'Jaffna Bus Stand',                 'යාපනය බස් නැවතුම',          'யாழ்ப்பாணம் பேருந்து நிலையம்', 41, 9.6615, 80.0255, TRUE,  'ACTIVE')
    ON CONFLICT (stop_code) DO NOTHING
  `);

  // ── Operator ──────────────────────────────────────────────────────────────
  await AppDataSource.query(`
    INSERT INTO operators (name, name_si, contact_email, status, ntc_licence_number)
    VALUES ('SLTB Central Province', 'SLTB මධ්‍යම පළාත', 'central@sltb.lk', 'ACTIVE', 'NTC-CP-001')
    ON CONFLICT DO NOTHING
  `);

  // ── Routes + route_stops (PL/pgSQL so we can reference IDs by stop_code) ──
  await AppDataSource.query(`
    DO $$
    DECLARE
      op_id   UUID;
      s_gam   UUID; s_hin UUID; s_ten UUID; s_pil UUID;
      s_per   UUID; s_pbg UUID; s_uni UUID; s_get UUID;
      s_bog   UUID; s_clk UUID; s_rai UUID; s_cty UUID;
    BEGIN
      SELECT id INTO op_id FROM operators WHERE status = 'ACTIVE' LIMIT 1;

      SELECT id INTO s_gam FROM bus_stops WHERE stop_code = 'KAN-GAM-01';
      SELECT id INTO s_hin FROM bus_stops WHERE stop_code = 'KAN-HIN-01';
      SELECT id INTO s_ten FROM bus_stops WHERE stop_code = 'KAN-TEN-01';
      SELECT id INTO s_pil FROM bus_stops WHERE stop_code = 'KAN-PIL-01';
      SELECT id INTO s_per FROM bus_stops WHERE stop_code = 'KAN-PER-01';
      SELECT id INTO s_pbg FROM bus_stops WHERE stop_code = 'KAN-PERBG-01';
      SELECT id INTO s_uni FROM bus_stops WHERE stop_code = 'KAN-UNI-01';
      SELECT id INTO s_get FROM bus_stops WHERE stop_code = 'KAN-GET-01';
      SELECT id INTO s_bog FROM bus_stops WHERE stop_code = 'KAN-BOG-01';
      SELECT id INTO s_clk FROM bus_stops WHERE stop_code = 'KAN-CLOCK-01';
      SELECT id INTO s_rai FROM bus_stops WHERE stop_code = 'KAN-RAIL-01';
      SELECT id INTO s_cty FROM bus_stops WHERE stop_code = 'KAN-CITY-01';

      -- Route 594: Gampola → Kandy (Normal)
      INSERT INTO routes (id, operator_id, route_number, name, name_si, name_ta,
                          origin_stop_id, dest_stop_id, bus_category,
                          district_from, district_to, status)
      VALUES ('${ROUTE_594_ID}', op_id, '594',
              'Gampola - Kandy',
              'ගම්පොල - කන්ඩි',
              'கம்போலா - கண்டி',
              s_gam, s_cty, 'ORDINARY', 21, 21, 'ACTIVE')
      ON CONFLICT (id) DO NOTHING;

      -- Route 590: Kandy → Gampola (return, same stops reversed)
      INSERT INTO routes (id, operator_id, route_number, name, name_si, name_ta,
                          origin_stop_id, dest_stop_id, bus_category,
                          district_from, district_to, status)
      VALUES ('${ROUTE_590_ID}', op_id, '590',
              'Kandy - Gampola',
              'කන්ඩි - ගම්පොල',
              'கண்டி - கம்போலா',
              s_cty, s_gam, 'ORDINARY', 21, 21, 'ACTIVE')
      ON CONFLICT (id) DO NOTHING;

      -- route_stops for 594 direction 0 (Gampola → Kandy)
      INSERT INTO route_stops (route_id, direction, stop_id, sequence, fare_stage_number, distance_from_origin)
      VALUES
        ('${ROUTE_594_ID}', 0, s_gam,  1,  1, 0.0),
        ('${ROUTE_594_ID}', 0, s_hin,  2,  2, 9.5),
        ('${ROUTE_594_ID}', 0, s_ten,  3,  2, 13.2),
        ('${ROUTE_594_ID}', 0, s_pil,  4,  3, 14.8),
        ('${ROUTE_594_ID}', 0, s_per,  5,  3, 16.1),
        ('${ROUTE_594_ID}', 0, s_pbg,  6,  3, 16.4),
        ('${ROUTE_594_ID}', 0, s_uni,  7,  3, 17.0),
        ('${ROUTE_594_ID}', 0, s_get,  8,  4, 18.3),
        ('${ROUTE_594_ID}', 0, s_bog,  9,  4, 20.5),
        ('${ROUTE_594_ID}', 0, s_clk, 10,  5, 21.8),
        ('${ROUTE_594_ID}', 0, s_rai, 11,  5, 22.0),
        ('${ROUTE_594_ID}', 0, s_cty, 12,  5, 22.3)
      ON CONFLICT (route_id, direction, sequence) DO NOTHING;

      -- route_stops for 590 direction 0 (Kandy → Gampola, reversed)
      INSERT INTO route_stops (route_id, direction, stop_id, sequence, fare_stage_number, distance_from_origin)
      VALUES
        ('${ROUTE_590_ID}', 0, s_cty,  1,  1, 0.0),
        ('${ROUTE_590_ID}', 0, s_rai,  2,  1, 0.3),
        ('${ROUTE_590_ID}', 0, s_clk,  3,  1, 0.5),
        ('${ROUTE_590_ID}', 0, s_bog,  4,  2, 1.8),
        ('${ROUTE_590_ID}', 0, s_get,  5,  2, 4.0),
        ('${ROUTE_590_ID}', 0, s_uni,  6,  3, 5.3),
        ('${ROUTE_590_ID}', 0, s_pbg,  7,  3, 5.9),
        ('${ROUTE_590_ID}', 0, s_per,  8,  3, 6.2),
        ('${ROUTE_590_ID}', 0, s_pil,  9,  3, 7.5),
        ('${ROUTE_590_ID}', 0, s_ten, 10,  4, 9.1),
        ('${ROUTE_590_ID}', 0, s_hin, 11,  4, 12.8),
        ('${ROUTE_590_ID}', 0, s_gam, 12,  5, 22.3)
      ON CONFLICT (route_id, direction, sequence) DO NOTHING;

    END $$;
  `);

  console.warn('Seeds complete.');
  await AppDataSource.destroy();
}

void runSeeds();
