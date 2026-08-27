import { Route, Routes } from 'react-router-dom';
import { EventsPage, PressReleasesPage, ResourcesPage } from './pages/archive-pages';
import { AnnouncementPage, EventDetailPage, PastTestDetailPage, PressDetailPage } from './pages/detail-pages';
import { HomePage } from './pages/home-page';
import { CalendarPage, ContactPage, NewslettersPage, NotFoundPage, PotmPage, SlgPage } from './pages/static-pages';

export function SiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:slug" element={<EventDetailPage />} />
      <Route path="/resources" element={<ResourcesPage />} />
      <Route path="/past-tests" element={<ResourcesPage onlyTests />} />
      <Route path="/mock-tests" element={<ResourcesPage onlyTests />} />
      <Route path="/past-tests/:slug" element={<PastTestDetailPage />} />
      <Route path="/press-releases" element={<PressReleasesPage />} />
      <Route path="/press-releases/:slug" element={<PressDetailPage />} />
      <Route path="/announcements/mathcounts" element={<AnnouncementPage />} />
      <Route path="/announcement" element={<AnnouncementPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/about-us" element={<SlgPage />} />
      <Route path="/about" element={<SlgPage />} />
      <Route path="/slg" element={<SlgPage />} />
      <Route path="/newsletters" element={<NewslettersPage />} />
      <Route path="/newsletter" element={<NewslettersPage />} />
      <Route path="/newletter" element={<NewslettersPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/gcalender" element={<CalendarPage />} />
      <Route path="/calender" element={<CalendarPage />} />
      <Route path="/potm" element={<PotmPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
