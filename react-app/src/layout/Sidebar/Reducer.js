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

export default sidebarReducer;
