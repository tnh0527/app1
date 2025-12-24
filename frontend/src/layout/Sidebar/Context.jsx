import { createContext, useReducer, useEffect } from "react";
import reducer from "../Sidebar/Reducer";
import PropTypes from "prop-types";

const initialState = {
  isSidebarOpen: false,
};

// Load the initial state from localStorage, if available
const getInitialState = () => {
  const savedState = localStorage.getItem("isSidebarOpen");

  // Check if savedState is a valid string before parsing
  if (savedState && savedState !== "undefined") {
    return { isSidebarOpen: JSON.parse(savedState) };
  } else {
    return initialState;
  }
};

export const SidebarContext = createContext({});

export const SidebarProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, getInitialState());

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("isSidebarOpen", JSON.stringify(state.isSidebarOpen));
  }, [state.isSidebarOpen]);

  const toggleSidebar = () => {
    dispatch({
      type: "TOGGLE_SIDEBAR",
    });
  };

  return (
    <SidebarContext.Provider
      value={{
        ...state,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

SidebarProvider.propTypes = {
  children: PropTypes.node,
};
