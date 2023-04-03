import { ChatPage } from '@pages/chatPage';
import { FavoritesPage } from '@pages/favoritesPage';
import { Sidebar } from '@components/sidebar/sidebar';
import { Route, Redirect, Switch } from 'wouter';
import { Loginpage } from '@pages/loginPage';
import { PageWithSidebar } from '@pages/templates/pageWithSidebar';
import { SyncData } from '@pages/syncDataPage';
import { SyncComplete } from '@pages/syncCompletePage';
import { useState } from 'react';
import { BaselineContext } from '@context/baselineContext';

function App() {
  const [currentProject, setCurrentProject] = useState<string | null>(
    'Select a project'
  );
  const [demoStage, setDemoStage] = useState(0);

  return (
    <BaselineContext.Provider
      value={{ currentProject, setCurrentProject, demoStage, setDemoStage }}
    >
      <Switch>
        <Route path="/login" component={() => <Loginpage />} />
        <Route
          path="/chat"
          component={() => (
            <PageWithSidebar>
              <ChatPage />
            </PageWithSidebar>
          )}
        />
        <Route
          path="/favorites"
          component={() => (
            <PageWithSidebar>
              <FavoritesPage />
            </PageWithSidebar>
          )}
        />

        <Route
          path="/manageData"
          component={() => (
            <PageWithSidebar>
              <SyncData />
            </PageWithSidebar>
          )}
        />
        <Route
          path="/syncComplete"
          component={() => (
            <PageWithSidebar>
              <SyncComplete />
            </PageWithSidebar>
          )}
        />

        <Route path="/" component={() => <Redirect to={'/login'} />} />
        <Route
          path="/:rest*"
          component={() => (
            <h1 className="mt-[40vh] text-center text-4xl font-bold">
              404 Page not found
            </h1>
          )}
        />
      </Switch>
    </BaselineContext.Provider>
  );
}

export default App;
