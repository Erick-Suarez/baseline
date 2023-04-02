import { ChatPage } from '@pages/chatPage';
import { FavoritesPage } from '@pages/favoritesPage';
import { Sidebar } from '@components/sidebar/sidebar';
import { Route, Redirect, Switch } from 'wouter';
import { Loginpage } from '@pages/loginPage';
import { PageWithSidebar } from '@pages/templates/pageWithSidebar';

function App() {
  return (
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
  );
}

export default App;
