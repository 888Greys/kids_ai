-- Grade 4 Math curriculum topic seeds (KICD/CBC style)
-- Safe to rerun: uses ON CONFLICT (topic_code) DO NOTHING.

insert into curriculum_topics (
  grade_level,
  strand,
  sub_strand,
  topic_code,
  topic_title,
  learning_outcome,
  source_name,
  source_url,
  is_active
)
values
  (4, 'Numbers', 'Whole Numbers', 'G4-MATH-NUM-001', 'Place Value to 100,000', 'Learner reads, writes, compares and orders whole numbers up to one hundred thousand.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Numbers', 'Whole Numbers', 'G4-MATH-NUM-002', 'Addition and Subtraction of Whole Numbers', 'Learner solves real-life addition and subtraction problems involving whole numbers up to 100,000.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Numbers', 'Whole Numbers', 'G4-MATH-NUM-003', 'Multiplication by 2-digit Numbers', 'Learner multiplies whole numbers by one-digit and two-digit multipliers using efficient strategies.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Numbers', 'Whole Numbers', 'G4-MATH-NUM-004', 'Division with Remainders', 'Learner divides whole numbers and interprets remainders in context.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Numbers', 'Fractions', 'G4-MATH-FRC-001', 'Equivalent Fractions', 'Learner identifies and generates equivalent fractions using diagrams and number reasoning.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Numbers', 'Fractions', 'G4-MATH-FRC-002', 'Comparing and Ordering Fractions', 'Learner compares and orders fractions with like and unlike denominators in simple contexts.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Numbers', 'Fractions', 'G4-MATH-FRC-003', 'Addition and Subtraction of Fractions', 'Learner adds and subtracts fractions with related denominators and explains the process.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Numbers', 'Decimals', 'G4-MATH-DEC-001', 'Decimals to Tenths and Hundredths', 'Learner reads, writes and represents decimals to tenths and hundredths.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Numbers', 'Decimals', 'G4-MATH-DEC-002', 'Operations with Simple Decimals', 'Learner solves practical problems involving addition and subtraction of simple decimals.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Measurement', 'Length', 'G4-MATH-MEA-001', 'Length Conversion', 'Learner converts between millimetres, centimetres, metres and kilometres where appropriate.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Measurement', 'Mass', 'G4-MATH-MEA-002', 'Mass Conversion', 'Learner converts between grams and kilograms and applies the skill in real-life tasks.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Measurement', 'Capacity', 'G4-MATH-MEA-003', 'Capacity Conversion', 'Learner converts between millilitres and litres and solves word problems.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Measurement', 'Time', 'G4-MATH-MEA-004', 'Time and Timetables', 'Learner reads digital and analogue time and interprets timetables and elapsed time.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Measurement', 'Money', 'G4-MATH-MEA-005', 'Money Transactions', 'Learner solves money problems involving buying, selling and giving change in Kenyan shillings.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Measurement', 'Perimeter and Area', 'G4-MATH-MEA-006', 'Perimeter of Rectangles and Squares', 'Learner calculates perimeter of simple 2D shapes and applies it in practical contexts.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Geometry', '2D Shapes', 'G4-MATH-GEO-001', 'Properties of 2D Shapes', 'Learner identifies properties of common 2D shapes including sides, vertices and symmetry lines.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Geometry', '3D Objects', 'G4-MATH-GEO-002', 'Properties of 3D Objects', 'Learner describes faces, edges and vertices of common 3D objects.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Geometry', 'Angles', 'G4-MATH-GEO-003', 'Identifying Angles', 'Learner identifies right, acute and obtuse angles in shapes and surroundings.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Geometry', 'Transformations', 'G4-MATH-GEO-004', 'Reflection and Translation', 'Learner performs simple reflections and translations on grid patterns.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Data Handling', 'Data Collection', 'G4-MATH-DAT-001', 'Collecting and Organizing Data', 'Learner collects data from class/home contexts and organizes it in tally tables.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Data Handling', 'Data Representation', 'G4-MATH-DAT-002', 'Pictographs and Bar Charts', 'Learner draws and interprets pictographs and simple bar charts.', 'KICD CBC', 'https://teacherske.co.ke/', true),
  (4, 'Data Handling', 'Data Interpretation', 'G4-MATH-DAT-003', 'Interpreting Charts', 'Learner answers questions and makes simple conclusions from data displays.', 'KICD CBC', 'https://teacherske.co.ke/', true)
on conflict (topic_code) do nothing;
