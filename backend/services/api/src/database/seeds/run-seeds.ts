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
      -- ── Kandy area stops ─────────────────────────────────────────────────
      ('KAN-CITY-01',  'Kandy City Centre Bus Stand',      'කන්ඩි නගර බස් නැවතුම',         'கண்டி நகர பேருந்து நிலையம்',        21,  7.2936, 80.6350, TRUE,  'ACTIVE'),
      ('KAN-CLOCK-01', 'Kandy Clock Tower',                'කන්ඩි ඔරලෝසු කුළුණ',           'கண்டி கடிகார கோபுரம்',              21,  7.2906, 80.6337, FALSE, 'ACTIVE'),
      ('KAN-RAIL-01',  'Kandy Railway Station',            'කන්ඩි දුම්රිය ස්ථානය',          'கண்டி இரயில் நிலையம்',              21,  7.2931, 80.6353, FALSE, 'ACTIVE'),
      ('KAN-DALADA-01','Temple of the Tooth Junction',     'දළදා මාළිගා හන්දිය',            'பல் கோவில் சந்தி',                  21,  7.2935, 80.6413, FALSE, 'ACTIVE'),
      ('KAN-BOG-01',   'Bogambara',                        'බොගම්බර',                       'போகம்பற',                           21,  7.2855, 80.6337, FALSE, 'ACTIVE'),
      ('KAN-ASG-01',   'Asgiriya',                         'අස්ගිරිය',                      'அஸ்கிரியா',                         21,  7.3024, 80.6303, FALSE, 'ACTIVE'),
      ('KAN-DHAR-01',  'Dharmaraja Junction',              'ධර්මරාජ හන්දිය',               'தர்மராஜா சந்தி',                    21,  7.2946, 80.6364, FALSE, 'ACTIVE'),
      ('KAN-GET-01',   'Getambe',                          'ගෙතඹේ',                         'கெட்டம்பே',                         21,  7.2715, 80.6172, FALSE, 'ACTIVE'),
      ('KAN-PER-01',   'Peradeniya Junction',              'පේරාදෙණිය හන්දිය',              'பேராதனி சந்தி',                     21,  7.2676, 80.5963, FALSE, 'ACTIVE'),
      ('KAN-PERBG-01', 'Peradeniya Botanical Gardens',     'පේරාදෙණිය උද්භිද උද්‍යානය',     'பேராதனி தாவரவியல் பூங்கா',         21,  7.2680, 80.5942, FALSE, 'ACTIVE'),
      ('KAN-UNI-01',   'University of Peradeniya',         'පේරාදෙණිය විශ්වවිද්‍යාලය',      'பேராதனி பல்கலைக்கழகம்',            21,  7.2540, 80.5915, FALSE, 'ACTIVE'),
      ('KAN-PIL-01',   'Pilimathalawa',                    'පිලිමතලාව',                     'பிலிமத்தலாவ',                       21,  7.2644, 80.5739, FALSE, 'ACTIVE'),
      ('KAN-KAT-01',   'Katugastota',                      'කටුගස්තොට',                     'கட்டுகஸ்தோட்டா',                    21,  7.3248, 80.6254, FALSE, 'ACTIVE'),
      ('KAN-LEW-01',   'Lewella',                          'ලෙවෙල්ල',                       'லேவெல்லா',                          21,  7.3080, 80.6511, FALSE, 'ACTIVE'),
      ('KAN-KUN-01',   'Kundasale',                        'කුණ්ඩසාලේ',                     'குண்டசாலே',                         21,  7.2980, 80.6640, FALSE, 'ACTIVE'),
      ('KAN-AMP-01',   'Ampitiya',                         'අඹිතියාව',                      'அம்பிட்டியா',                       21,  7.2824, 80.6615, FALSE, 'ACTIVE'),
      ('KAN-DIG-01',   'Digana',                           'දිගන',                          'டிகானா',                            21,  7.3071, 80.7219, FALSE, 'ACTIVE'),
      ('KAN-WAT-01',   'Wattegama',                        'වත්තේගම',                       'வட்டேகாமா',                         21,  7.3532, 80.6843, FALSE, 'ACTIVE'),
      ('KAN-TEN-01',   'Tennekumbura',                     'තෙන්නේකුඹුර',                   'தென்னேகும்புர',                     21,  7.3463, 80.6012, FALSE, 'ACTIVE'),
      ('KAN-GAM-01',   'Gampola',                          'ගම්පොල',                        'கம்போலா',                           21,  7.1638, 80.5739, FALSE, 'ACTIVE'),
      ('KAN-HIN-01',   'Hindagala',                        'හිඳගල',                         'இந்தகல',                            21,  7.2567, 80.6127, FALSE, 'ACTIVE'),
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
