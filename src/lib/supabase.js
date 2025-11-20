import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fpuofgrypgabfsbqsxku.supabase.co';
const supabaseKey = 'sb_publishable_KozTC9kRBA8katDpT-rirA_2RQXaPwO';

export const supabase = createClient(supabaseUrl, supabaseKey);

