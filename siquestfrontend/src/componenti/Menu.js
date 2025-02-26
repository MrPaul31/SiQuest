import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { endpoint, AuthContext } from './config/AuthContext';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';

const Menu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useContext(AuthContext);
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState({});

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const response = await endpoint.get('/abilitazioneUtenti/menu');
        setMenuData(response.data);
        console.log('Menu caricato:', response.data);
        
        // Auto-expand nodes that contain the current path or are ancestors of it
        if (response.data && response.data.tree) {
          const expanded = {};
          findAndExpandActiveNodes(response.data.tree, location.pathname, 
            response.data.functions, expanded);
          setExpandedNodes(expanded);
        }
      } catch (error) {
        console.error('Errore nel recupero del menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, [location.pathname]);

  // Find and mark all nodes that should be expanded based on the active path
  const findAndExpandActiveNodes = (nodes, activePath, functions, expanded) => {
    for (const node of nodes) {
      const func = functions.find(f => f.functionId === node.id);
      
      // If this node matches the active path, return true to expand parent
      if (func && func.EFU_RottaFrontend === activePath) {
        return true;
      }
      
      // If node has children, check them
      if (node.children && node.children.length > 0) {
        const shouldExpand = findAndExpandActiveNodes(
          node.children, activePath, functions, expanded
        );
        
        if (shouldExpand) {
          expanded[node.id] = true;
          return true; // Propagate upwards
        }
      }
    }
    return false;
  };

  const toggleExpanded = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  if (loading) {
    return (
      <div className="h-screen w-64 bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center">
        <p className="text-blue-800 animate-pulse">Caricamento menu...</p>
      </div>
    );
  }

  if (!menuData) {
    return (
      <div className="h-screen w-64 bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center">
        <p className="text-red-600">Nessun menu disponibile</p>
      </div>
    );
  }

  // Map functions by functionId for easier lookup
  const functionMap = menuData.functions.reduce((map, func) => {
    map[func.functionId] = func;
    return map;
  }, {});

  // Helper: Check if any descendant node is active.
  const isDescendantActive = (node) => {
    if (!node.children || node.children.length === 0) return false;
    return node.children.some(child => {
      const childFunc = functionMap[child.id];
      if(childFunc && location.pathname === childFunc.EFU_RottaFrontend) return true;
      return child.children && isDescendantActive(child);
    });
  };

  // Recursive function to render the menu tree
  const renderTree = (nodes, level = 0) => {
    return (
      <ul className={`w-full ${level > 0 ? 'pl-3 border-l-2 border-blue-100 ml-2' : ''}`}>
        {nodes.map((node, index) => {
          const funcDetails = functionMap[node.id];
          const isEven = index % 2 === 0;

          // Skip special nodes: if they are for '/login' or '/Menu', render only children.
          if (funcDetails && (funcDetails.EFU_RottaFrontend === '/login' || funcDetails.EFU_RottaFrontend === '/Menu')) {
            return (
              <React.Fragment key={node.id}>
                {node.children && node.children.length > 0 && renderTree(node.children, level)}
              </React.Fragment>
            );
          }

          const isParent = node.children && node.children.length > 0;
          const isExpanded = expandedNodes[node.id];
          const isHeaderActive = isDescendantActive(node);

          // For leaf (clickable) nodes
          if (!isParent) {
            const isActive = funcDetails && location.pathname === funcDetails.EFU_RottaFrontend;
            return (
              <li key={node.id} className={`mb-2 ${level > 0 ? 'mt-1' : 'mt-2'}`}>
                <button
                  onClick={() => {
                    if (funcDetails && funcDetails.EFU_RottaFrontend) {
                      navigate(funcDetails.EFU_RottaFrontend);
                    }
                  }}
                  className={`
                    w-full py-2 px-3 rounded-lg text-left text-sm font-medium
                    transition-all duration-200 transform hover:scale-102 shadow-sm
                    ${isActive 
                      ? "bg-blue-100 text-blue-800 border-l-4 border-blue-500" 
                      : "bg-white text-gray-700 border-l-4 border-transparent hover:border-blue-300 hover:bg-blue-50"
                    }
                  `}
                  style={{ paddingLeft: `${1 + level * 0.75}rem` }}
                >
                  {funcDetails ? funcDetails.EFU_NomeFunzione : `Funzione ${node.id}`}
                </button>
              </li>
            );
          }

          // For parent nodes (section headers)
          return (
            <li key={node.id} className={`mb-1 ${level > 0 ? 'mt-1' : 'mt-3'}`}>
              <div 
                onClick={() => toggleExpanded(node.id)} 
                className={`
                  w-full py-2 px-3 rounded-lg text-left font-bold cursor-pointer
                  transition-all duration-200 flex items-center justify-between
                  ${isHeaderActive 
                    ? "bg-blue-50 text-blue-800 border-l-4 border-blue-500" 
                    : "bg-white text-gray-800 border-l-4 border-blue-300 hover:bg-blue-50"
                  }
                `}
              >
                <span className={`${level === 0 ? 'text-lg' : 'text-base'}`}>
                  {funcDetails ? funcDetails.EFU_NomeFunzione : `Funzione ${node.id}`}
                </span>
                {isExpanded ? <FaChevronDown className="text-blue-500" /> : <FaChevronRight className="text-blue-400" />}
              </div>
              
              {isExpanded && node.children && (
                <div className={`mt-1 transition-all duration-300 ${isExpanded ? 'max-h-screen' : 'max-h-0 overflow-hidden'}`}>
                  {renderTree(node.children, level + 1)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="h-screen w-64 flex flex-col justify-between relative overflow-hidden bg-gradient-to-t from-blue-100 via-blue-50 to-blue-100 animate-fadeIn shadow-lg">
      {/* Decorative elements similar to QuestionarioPage */}
      <div className="absolute w-48 h-48 bg-blue-400 opacity-10 rounded-full -top-10 -left-20"></div>
      <div className="absolute w-40 h-40 bg-yellow-400 opacity-15 rounded-full top-60 -right-10"></div>
      <div className="absolute w-36 h-36 bg-red-300 opacity-10 rounded-full bottom-20 -left-20"></div>

      {/* Header */}
      <div className="py-4 px-2 text-center">
        <h2 className="text-xl font-bold text-blue-800">SiQuest</h2>
        <p className="text-sm text-blue-600">Menu Navigazione</p>
      </div>
      
      {/* Navigation */}
      <nav className="flex-grow overflow-y-auto px-2" style={{ scrollbarWidth: "none" }}>
        <style>{`
          nav::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {renderTree(menuData.tree)}
      </nav>
      
      {/* Footer with Login and Logout buttons */}
      <div className="p-3 flex justify-between items-center bg-white/70 backdrop-blur-sm">
        <button
          onClick={() => navigate('/login')}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md text-sm font-medium"
        >
          Login
        </button>
        <button
          onClick={handleLogout}
          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-md text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Menu;