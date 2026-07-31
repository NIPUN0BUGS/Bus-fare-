import 'reflect-metadata';
import AppDataSource from '../data-source';

async function runSeeds() {
  await AppDataSource.initialize();
  console.warn('Running seeds...');

  // ── Provinces ─────────────────────────────────────────────────────────────
  await AppDataSource.query(`
    INSERT INTO provinces (id, name, name_si, name_ta) VALUES
      (1, 'Western',   'බස්නාහිර',  'மேல்'),
      (2, 'Central',   'මධ්‍යම',     'மத்திய'),
      (3, 'Southern',  'දකුණ',       'தெற்கு'),
      (4, 'Northern',  'උතුර',       'வடக்கு'),
      (5, 'Eastern',   'නැගෙනහිර',  'கிழக்கு'),
      (6, 'North Western', 'උතුරු බස්නාහිර', 'வடமேல்'),
      (7, 'North Central', 'උතුරු මධ්‍යම',   'வட மத்திய'),
      (8, 'Uva',       'ඌව',         'ஊவா'),
      (9, 'Sabaragamuwa', 'සබරගමුව', 'சபரகாமுவா')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Districts ─────────────────────────────────────────────────────────────
  await AppDataSource.query(`
    INSERT INTO districts (id, province_id, name, name_si, name_ta) VALUES
      (11, 1, 'Colombo',      'කොළඹ',      'கொழும்பு'),
      (12, 1, 'Gampaha',      'ගම්පහ',     'கம்பஹா'),
      (13, 1, 'Kalutara',     'කළුතර',     'களுத்துறை'),
      (21, 2, 'Kandy',        'මහනුවර',    'கண்டி'),
      (22, 2, 'Matale',       'මාතලේ',     'மாத்தளை'),
      (23, 2, 'Nuwara Eliya', 'නුවරඑළිය',  'நுவர எலியா'),
      (31, 3, 'Galle',        'ගාල්ල',     'காலி'),
      (32, 3, 'Matara',       'මාතර',      'மாத்தறை'),
      (33, 3, 'Hambantota',   'හම්බන්තොට', 'அம்பாந்தோட்டை'),
      (41, 4, 'Jaffna',       'යාපනය',     'யாழ்ப்பாணம்'),
      (51, 5, 'Ampara',       'අම්පාර',    'அம்பாறை'),
      (61, 6, 'Kurunegala',   'කුරුණෑගල',  'குருணாகல்'),
      (71, 7, 'Anuradhapura', 'අනුරාධපුරය','அனுராதபுரம்'),
      (81, 8, 'Badulla',      'බදුල්ල',    'பதுலை'),
      (91, 9, 'Ratnapura',    'රත්නපුර',   'இரத்தினபுரி')
    ON CONFLICT (id) DO NOTHING
  `);

  // ── Sample Stops (Colombo area) ───────────────────────────────────────────
  await AppDataSource.query(`
    INSERT INTO bus_stops (stop_code, name, name_si, name_ta, district_id, lat, lng, is_terminus, status)
    VALUES
      ('CMB-FORT-01', 'Colombo Fort Bus Stand', 'කොළඹ ෆෝට් බස් නැවතුම', 'கொழும்பு கோட்டை', 11, 6.9341, 79.8428, TRUE, 'ACTIVE'),
      ('COL-NUG-01', 'Nugegoda', 'නුගේගොඩ', 'நுகேகோடா', 11, 6.8730, 79.8975, FALSE, 'ACTIVE'),
      ('COL-BOR-01', 'Borella', 'බොරැල්ල', 'பொறல்ல', 11, 6.9103, 79.8698, FALSE, 'ACTIVE'),
      ('COL-MAH-01', 'Maharagama', 'මහරගම', 'மகரகம', 11, 6.8492, 79.9260, FALSE, 'ACTIVE'),
      ('KAN-CITY-01', 'Kandy City Centre', 'කන්ඩි නගර මධ්‍යස්ථානය', 'கண்டி நகர மையம்', 21, 7.2906, 80.6337, TRUE, 'ACTIVE'),
      ('GAL-CITY-01', 'Galle Bus Stand', 'ගාල්ල බස් නැවතුම', 'காலி பேருந்து நிலையம்', 31, 6.0326, 80.2170, TRUE, 'ACTIVE'),
      ('JAF-CITY-01', 'Jaffna Bus Stand', 'යාපනය බස් නැවතුම', 'யாழ்ப்பாணம் பேருந்து நிலையம்', 41, 9.6615, 80.0255, TRUE, 'ACTIVE')
    ON CONFLICT (stop_code) DO NOTHING
  `);

  // ── Sample Operator (development only) ────────────────────────────────────
  await AppDataSource.query(`
    INSERT INTO operators (name, name_si, contact_email, status, ntc_licence_number)
    VALUES ('SLTB Western Province', 'SLTB බස්නාහිර පළාත', 'wp@sltb.lk', 'ACTIVE', 'NTC-WP-001')
    ON CONFLICT DO NOTHING
  `);

  console.warn('Seeds complete.');
  await AppDataSource.destroy();
}

void runSeeds();
