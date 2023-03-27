import { ChatPage } from '@pages/chatPage';
import { FavoritesPage } from '@pages/favoritesPage';
import { Sidebar } from '@components/sidebar/sidebar';
import { Route } from 'wouter';

function App() {
  return (
    <div className="flex h-[100vh] w-[100vw]">
      <Sidebar />
      <div className="h-full w-full flex-grow">
        <Route path="/chat" component={ChatPage} />
        <Route path="/favorites" component={FavoritesPage} />
      </div>
    </div>
  );
}

export default App;
