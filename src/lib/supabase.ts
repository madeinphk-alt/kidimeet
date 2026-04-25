import { createClient } from '@supabase/supabase-js';

// TODO: Replace mock data with these Supabase calls once env vars are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Example queries (to replace mock-data.ts in production) ────────────────

export async function getClassmates(classId: string) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('class_id', classId);
  if (error) throw error;
  return data;
}

export async function getAvailabilityForDate(classId: string, date: string) {
  // Get children in class with availability on this day_of_week
  const dayOfWeek = new Date(date).getDay();
  const { data, error } = await supabase
    .from('child_availability')
    .select('*, children!inner(*)')
    .eq('children.class_id', classId)
    .eq('day_of_week', dayOfWeek)
    .eq('active', true);
  if (error) throw error;
  return data;
}

export async function getMeetupHistory(child1Id: string, child2Id: string) {
  const { data, error } = await supabase
    .from('meetups')
    .select('*')
    .or(`and(child1_id.eq.${child1Id},child2_id.eq.${child2Id}),and(child1_id.eq.${child2Id},child2_id.eq.${child1Id})`)
    .order('date', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

export async function createMeetupRequest(request: {
  requester_child_id: string;
  recipient_child_id: string;
  scheduled_date: string;
  host_child_id: string;
  activity?: string;
}) {
  const { data, error } = await supabase
    .from('meetup_requests')
    .insert(request)
    .select()
    .single();
  if (error) throw error;
  return data;
}
