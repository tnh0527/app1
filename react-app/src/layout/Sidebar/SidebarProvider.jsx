import Sidebar from "./Sidebar";
import { ProfileProvider } from "../../utils/ProfileContext";

const SidebarProvider = () => {
  return (
    <ProfileProvider>
      <Sidebar />
    </ProfileProvider>
  );
};

export default SidebarProvider;
