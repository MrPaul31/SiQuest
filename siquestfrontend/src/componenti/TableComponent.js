import React, { useState, useEffect } from "react";

const TableComponent = ({ tableData, columnsToDisplay, referenceData, tableHeight, handleExportToCSV }) => {
  // ✅ State for CSV Download Animation
  const [csvDownloading, setCsvDownloading] = useState(false);

  // ✅ State for Row Loading Animation
  const [loading, setLoading] = useState(true);
  const [renderedRows, setRenderedRows] = useState([]);

  // ✅ Handle CSV Download Animation
  const handleDownloadCSV = () => {
    setCsvDownloading(true);

    setTimeout(() => {
      handleExportToCSV();
      setCsvDownloading(false);
    }, 1500); // Simulated delay for animation
  };

  // ✅ Animate Table Row Appearance
  useEffect(() => {
    setLoading(true);
    setRenderedRows([]); // Reset rows

    let intervalSpeed = 200; // Start slow
    let index = 0;

    const interval = setInterval(() => {
      if (index < tableData.length) {
        setRenderedRows((prevRows) => [...prevRows, tableData[index]]);
        index++;
        if (intervalSpeed > 50) intervalSpeed -= 20; // Speed up loading
      } else {
        clearInterval(interval);
        setLoading(false);
      }
    }, intervalSpeed);
    
    return () => clearInterval(interval);
  }, [tableData]);

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        {/* ✅ CSV Download Button with Animation */}
        <button
          onClick={handleDownloadCSV}
          className={`relative flex items-center justify-center px-4 py-2 rounded-md text-white 
                      bg-blue-900 hover:bg-blue-700 transition-all duration-300 ease-in-out 
                      ${csvDownloading ? "cursor-not-allowed bg-blue-600" : ""}`}
          disabled={csvDownloading}
        >
          {csvDownloading ? (
            <>
              <span className="animate-spin h-5 w-5 border-t-2 border-white rounded-full mr-2"></span>
              Scaricamento...
            </>
          ) : (
            "📥 Salva in CSV"
          )}
        </button>
      </div>

      <div
        className="overflow-y-auto border border-gray-300"
        style={{ height: `${tableHeight}px` }}
      >
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              {columnsToDisplay.map((column) =>
                column.value === 0 ? null : (
                  <th
                    key={column.name}
                    className={`py-2 px-4 border border-gray-300 text-left 
                                transition-all duration-300 ease-in-out 
                                hover:bg-gray-200 cursor-pointer ${
                                  column.value === 1 ? "hidden" : ""
                                }`}
                  >
                    {column.columnName}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // ✅ Loading state animation
              <tr>
                <td colSpan={columnsToDisplay.length} className="py-4 text-center">
                  <span className="animate-pulse text-gray-500">Caricamento dati...</span>
                </td>
              </tr>
            ) : (
              renderedRows.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-100 transition-all duration-200 ease-in-out">
                  {columnsToDisplay.map((column) => {
                    if (column.value === 0) return null;

                    if (column.isFK && referenceData[column.name]) {
                      const fkId = item[column.name];
                      const refArray = referenceData[column.name];
                      const matchedRef = refArray.find((ref) => ref.id === fkId);
                      const label = matchedRef
                        ? matchedRef[column.displayField] || matchedRef.id
                        : fkId;

                      return (
                        <td
                          key={column.name}
                          className={`py-2 px-4 border border-gray-300 transition-opacity duration-500 ease-in-out ${
                            column.value === 1 ? "hidden" : ""
                          }`}
                        >
                          {label}
                        </td>
                      );
                    } else {
                      return (
                        <td
                          key={column.name}
                          className={`py-2 px-4 border border-gray-300 transition-opacity duration-500 ease-in-out ${
                            column.value === 1 ? "hidden" : ""
                          }`}
                        >
                          {item[column.name]}
                        </td>
                      );
                    }
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableComponent;
