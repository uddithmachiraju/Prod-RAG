import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Workspace from '../pages/Workspace';
import Projects from '../pages/Projects';
import Documents from '../pages/Documents';
import Chats from '../pages/Chats';
import Notes from '../pages/Notes';
import Reports from '../pages/Reports';
import Analytics from '../pages/Analytics';
import PromptLibrary from '../pages/PromptLibrary';
import Integrations from '../pages/Integrations';
import Settings from '../pages/Settings';
import AdminConsole from '../pages/AdminConsole';

export const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/workspace', element: <Workspace /> },
      { path: '/projects', element: <Projects /> },
      { path: '/documents', element: <Documents /> },
      { path: '/chats', element: <Chats /> },
      { path: '/notes', element: <Notes /> },
      { path: '/reports', element: <Reports /> },
      { path: '/analytics', element: <Analytics /> },
      { path: '/prompts', element: <PromptLibrary /> },
      { path: '/integrations', element: <Integrations /> },
      { path: '/settings', element: <Settings /> },
      { path: '/admin', element: <AdminConsole /> },
    ],
  },
]);
