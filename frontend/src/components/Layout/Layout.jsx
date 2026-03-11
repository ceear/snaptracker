import { Outlet } from 'react-router-dom';
import TopNav from './TopNav.jsx';
import ImageModal from '../Modal/ImageModal.jsx';
import { useUIStore } from '../../store/ui.js';

export default function Layout() {
  const modalImageId = useUIStore(s => s.modalImageId);

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      <TopNav />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      {modalImageId !== null && <ImageModal />}
    </div>
  );
}
