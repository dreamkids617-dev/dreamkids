# Dream Kids Studio - Supabase Integration

## Design
- Color palette: Indigo-600 (#4F46E5) primary, Violet-500 accent, Amber-400 ratings
- Typography: System font, bold headings, clean body text
- Mobile-first responsive design with bottom navigation

## Development Tasks
- [x] Create Supabase database tables (institutions, favorites, inquiries, recent_views)
- [x] Seed institution data into Supabase
- [x] Set up RLS policies for all tables
- [x] Create AuthContext with Supabase auth (signUp, signIn, signOut)
- [x] Update Login page with real Supabase authentication
- [x] Update Index page to fetch institutions from Supabase
- [x] Update Search page to query institutions from Supabase
- [x] Update Detail page with Supabase favorites, inquiries, recent views
- [x] Update MyPage to load user data from Supabase (favorites, recent, inquiries)
- [x] Update Admin page with Supabase CRUD for institutions and inquiries
- [x] Wrap App with AuthProvider
- [x] Add CompareContext and CompareBar for institution comparison
- [x] Add Compare page for side-by-side institution comparison
- [x] Add ReservationModal for consultation booking
- [x] Add reservations tab to MyPage
- [x] Add reservations management tab to Admin page
- [x] Add password reset for general users (ResetPassword page)
- [x] Add compare button to Search page cards
- [x] Lint and build pass
- [x] UI rendering validated