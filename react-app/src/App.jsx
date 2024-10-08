import "./App.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Login from "./components/Login/Login";
//import Home from "./components/Home/Home";
import Sidebar from "./layout/Sidebar/Sidebar";
import Content from "./layout/Content/Content";

function App() {
  const route = createBrowserRouter([
    {
      path: "/",
      element: <Login />,
    },
    {
      path: "/Home",
      element: (
        <div className="app">
          <Sidebar />
          <Content />
        </div>
      ),
    },
  ]);

  return (
    <div className="App">
      <RouterProvider router={route} />
    </div>
  );
}

export default App;
