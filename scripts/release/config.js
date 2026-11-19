'use strict';

// Public Supabase hosts (already shipped inside the app bundle), used to stop a
// release from pairing the wrong build profile with the wrong database.
module.exports = {
  supabaseHosts: {
    production: 'ykfbvrkqzzyyeheblhye.supabase.co',
    preview: 'isezzedrbdomyhfuqjak.supabase.co'
  }
};
