import React from "react";

interface NavBarProps {
      title?: string | null;
}

const NavBar: React.FC<NavBarProps> = () => {
      return (
            <nav className="bg-gradient-to-r py-4 shadow-lg top-0 z-30 mb-6">
                  <div className="container mx-auto flex justify-between items-center px-4">
                        <img
                              src="/NavBar.png"
                              alt="Memory Timeline Logo"
                              className="max-h-20 object-contain mix-blend-darken"
                        />
                  </div>
            </nav>
      );
};

export default NavBar;
