import "./App.css";
import {
  RouterProvider,
  createBrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login/Login";
import Sidebar from "./layout/Sidebar/Sidebar";
import Content from "./layout/Content/Content";
import EditProfile from "./pages/EditProfile/EditProfile";
import ProfileLeft from "./pages/EditProfile/ProfileLeft";
import Security from "./pages/Security/Security";

const Account = () => {
  return (
    <div className="app">
      <Sidebar />
      <ProfileLeft />
      <Routes>
        <Route path="/" element={<Navigate to="edit-profile" replace />} />
        <Route path="edit-profile" element={<EditProfile />} />
        <Route path="security" element={<Security />} />
      </Routes>
    </div>
  );
};

function App() {
  const route = createBrowserRouter([
    {
      path: "/",
      element: <Login />,
    },
    {
      path: "/home",
      element: (
        <div className="app">
          <Sidebar />
          <Content />
        </div>
      ),
    },
    {
      path: "/account/*",
      element: <Account />,
    },
  ]);

  return (
    <div className="App">
      <RouterProvider router={route} />
    </div>
  );
}

export default App;
