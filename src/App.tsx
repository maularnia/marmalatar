import EditorLayout from '@src/layout/EditorLayout';
import GeneralLayout from '@src/layout/GeneralLayout';
import { useAppSelectors } from '@store/hooks';
import { workingFolder } from '@store/slices/workingFolder';
import { Navigate, Route, Routes } from 'react-router-dom';
import GlobalBackground from './layout/components/GlobalBackground';
import { StaticPageLayout } from './layout/StaticPageLayout';
import Editor from './segments/pages/Editor';
import FolderSetup from './segments/pages/FolderSetup';
import Home from './segments/pages/Home';
import Import from './segments/pages/Import';

function HomeGuard() {
  const [folder, initialized] = useAppSelectors(
    workingFolder.selectFolder,
    workingFolder.selectInitialized
  );
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
