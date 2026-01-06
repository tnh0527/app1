import { createContext, useReducer, useEffect } from "react";

const sidebarReducer = (state, action) => {
  switch (action.type) {
    case "TOGGLE_SIDEBAR": {
      const newState = {
        ...state,
        isSidebarOpen: !state.isSidebarOpen,
      };
      return newState;
    }
    default:
      throw new Error(`No matching "${action.type}" action type`);
  }
};

// Default to expanded sidebar on first visit
const initialState = {
  isSidebarOpen: true,
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
  const [state, dispatch] = useReducer(sidebarReducer, getInitialState());

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
