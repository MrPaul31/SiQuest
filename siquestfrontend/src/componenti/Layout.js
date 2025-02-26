import React from "react";
import PropTypes from "prop-types";
import Menu from "./Menu";
import Immagine from "./Immagine";
import { Outlet } from "react-router-dom";

const Layout = ({ handleLogout }) => {
  return (
    <div className="flex min-h-screen relative bg-blue-50 text-blue-900">
      {/* Fixed Image on the Left */}
      <div className="fixed bottom-0 left-0 p-4">
        <Immagine className="h-28 w-auto" />
      </div>

      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <Menu />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="w-full flex justify-end bg-white p-4 shadow-md">
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          >
            Logout
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8">
          <Outlet /> {/* Dynamically render child route content */}
        </div>
      </div>
    </div>
  );
};

Layout.propTypes = {
  handleLogout: PropTypes.func.isRequired,
};

export default Layout;
