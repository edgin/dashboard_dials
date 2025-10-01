import "./App.scss";
import Dashboard from "./Components/Dashboard";
import { StoreProvider } from "./Store/DashboardContext";

function App() {
  return (
    <div className="App">
      <StoreProvider>
        <Dashboard />
      </StoreProvider>
    </div>
  );
}

export default App;
