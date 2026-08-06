import EditorLayout from '@src/layout/EditorLayout';
import GeneralLayout from '@src/layout/GeneralLayout';
import { useAppSelector } from '@store/hooks';
import { selectFolder, selectInitialized } from '@store/slices/disc';
import { Navigate, Route, Routes } from 'react-router-dom';
import Editor from './segments/pages/Editor';
import FolderSetup from './segments/pages/FolderSetup';
import Home from './segments/pages/Home';
import { StaticPageLayout } from './layout/StaticPageLayout';
import Import from './segments/pages/Import';
import GlobalBackground from './layout/components/GlobalBackground';

function HomeGuard() {
  const folder = useAppSelector(selectFolder);
  const initialized = useAppSelector(selectInitialized);
  if (!initialized) return null;
  if (!folder) return <Navigate to="/folder-setup" replace />;
  return <Home />;
}

export default function App() {
  return (
    <>
      <GlobalBackground />
      <Routes>
        <Route element={<GeneralLayout />}>
          <Route element={<StaticPageLayout />}>
            <Route path="/folder-setup" element={<FolderSetup />} />
            <Route path="/intro/import" element={<Import />} />
            <Route path="/" element={<HomeGuard />} />
          </Route>
          <Route path="/workspace" element={<EditorLayout />}>
            <Route index element={<Editor />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
