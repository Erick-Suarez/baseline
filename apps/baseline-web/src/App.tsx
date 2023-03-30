import { ChatPage } from '@pages/chatPage';
import { FavoritesPage } from '@pages/favoritesPage';
import { Sidebar } from '@components/sidebar/sidebar';
import { Route, Redirect, Switch } from 'wouter';

function App() {
  return (
    <div className="flex h-[100vh] w-[100vw]">
      <Sidebar />
      <div className="h-full w-full flex-grow">
        <Switch>
          <Route path="/chat" component={ChatPage} />
          <Route path="/favorites" component={FavoritesPage} />
          <Route path="/" component={() => <Redirect to={'/chat'} />} />
          <Route
            path="/:rest*"
            component={() => (
              <h1 className="mt-[40vh] text-center text-4xl font-bold">
                404 Page not found
              </h1>
            )}
          />
        </Switch>
      </div>
    </div>
  );
}

export default App;
