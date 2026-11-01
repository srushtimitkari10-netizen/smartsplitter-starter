import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .limit(5);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Supabase connected successfully!',
      expenses: data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}