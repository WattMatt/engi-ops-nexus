import React, { useState, useEffect, useMemo } from 'react';

const CableDetailsModal = ({ isOpen, onClose, onSubmit, existingCableTypes, purposeConfig }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [label, setLabel] = useState('');
  const [selectedCableType, setSelectedCableType] = useState('');
  const [customCableType, setCustomCableType] = useState('');
  const [terminationCount, setTerminationCount] = useState('2');
  const [startHeight, setStartHeight] = useState('3');
  const [endHeight, setEndHeight] = useState('3');

  const allCableOptions = useMemo(() => {
    if (!purposeConfig) return [];
    const combined = new Set([...purposeConfig.cableTypes, ...existingCableTypes]);
    return Array.from(combined).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [existingCableTypes, purposeConfig]);

  useEffect(() => {
    if (isOpen) {
      // Reset fields when modal opens
      setFrom('');
      setTo('');
      setLabel('');
      setSelectedCableType('');
      setCustomCableType('');
      setTerminationCount('2');
      setStartHeight('3');
      setEndHeight('3');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalCableType = selectedCableType === 'other' ? customCableType.trim() : selectedCableType;
    const count = parseInt(terminationCount, 10);
    const startH = parseFloat(startHeight);
    const endH = parseFloat(endHeight);

    if (from.trim() && to.trim() && finalCableType && !isNaN(count) && count >= 0 && !isNaN(startH) && startH >= 0 && !isNaN(endH) && endH >= 0) {
      onSubmit({ from, to, cableType: finalCableType, terminationCount: count, startHeight: startH, endHeight: endH, label: label.trim() });
    } else {
      alert('Please fill in all fields with valid values.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" },
      React.createElement("div", { className: "bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg" },
        React.createElement("h2", { className: "text-2xl font-bold text-white mb-4" }, "LV/AC Cable Details"),
        React.createElement("p", { className: "text-gray-400 mb-6" }, "Enter the details for the Low Voltage or AC cable you just drew."),
        React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" },
          React.createElement("div", { className: "grid grid-cols-2 gap-4" },
            React.createElement("div", null,
              React.createElement("label", { htmlFor: "from", className: "block text-sm font-medium text-gray-300 mb-2" },
                "Supply From"
              ),
              React.createElement("input", {
                type: "text",
                id: "from",
                value: from,
                onChange: (e) => setFrom(e.target.value),
                className: "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                placeholder: "e.g., Main Board 1",
                autoFocus: true
              })
            ),
            React.createElement("div", null,
              React.createElement("label", { htmlFor: "to", className: "block text-sm font-medium text-gray-300 mb-2" },
                "Supply To"
              ),
              React.createElement("input", {
                type: "text",
                id: "to",
                value: to,
                onChange: (e) => setTo(e.target.value),
                className: "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                placeholder: "e.g., Shop 1"
              })
            )
          ),
           React.createElement("div", null,
            React.createElement("label", { htmlFor: "label", className: "block text-sm font-medium text-gray-300 mb-2" },
              "Line Label (Optional)"
            ),
            React.createElement("input", {
              type: "text",
              id: "label",
              value: label,
              onChange: (e) => setLabel(e.target.value),
              className: "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500",
              placeholder: "e.g., Feeder 1"
            })
          ),
          React.createElement("div", { className: "grid grid-cols-2 gap-4" },
            React.createElement("div", null,
                React.createElement("label", { htmlFor: "startHeight", className: "block text-sm font-medium text-gray-300 mb-2" },
                "Start Height / Rise (m)"
                ),
                React.createElement("input", {
                type: "number",
                id: "startHeight",
                value: startHeight,
                onChange: (e) => setStartHeight(e.target.value),
                className: "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                placeholder: "e.g., 3.0",
                min: "0",
                step: "0.1"
                })
            ),
            React.createElement("div", null,
                React.createElement("label", { htmlFor: "endHeight", className: "block text-sm font-medium text-gray-300 mb-2" },
                "End Height / Drop (m)"
                ),
                React.createElement("input", {
                type: "number",
                id: "endHeight",
                value: endHeight,
                onChange: (e) => setEndHeight(e.target.value),
                className: "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                placeholder: "e.g., 3.0",
                min: "0",
                step: "0.1"
                })
            )
          ),
          React.createElement("div", null,
            React.createElement("label", { htmlFor: "cableType", className: "block text-sm font-medium text-gray-300 mb-2" },
              "Cable Type"
            ),
            React.createElement("select", {
              id: "cableType",
              value: selectedCableType,
              onChange: (e) => setSelectedCableType(e.target.value),
              className: "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            },
              React.createElement("option", { value: "", disabled: true }, "-- Select a cable type --"),
              allCableOptions.map(type => (
                React.createElement("option", { key: type, value: type }, type)
              )),
              React.createElement("option", { value: "other" }, "Other (specify below)")
            )
          ),
          selectedCableType === 'other' && (
            React.createElement("div", null,
              React.createElement("label", { htmlFor: "customCableType", className: "block text-sm font-medium text-gray-300 mb-2" },
                "Custom Cable Type"
              ),
              React.createElement("input", {
                type: "text",
                id: "customCableType",
                value: customCableType,
                onChange: (e) => setCustomCableType(e.target.value),
                className: "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                placeholder: "e.g., 2Core x 10mm Cu",
                autoFocus: true
              })
            )
          ),
          React.createElement("div", null,
            React.createElement("label", { htmlFor: "terminationCount", className: "block text-sm font-medium text-gray-300 mb-2" },
              "Number of Terminations"
            ),
            React.createElement("input", {
              type: "number",
              id: "terminationCount",
              value: terminationCount,
              onChange: (e) => setTerminationCount(e.target.value),
              className: "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500",
              placeholder: "e.g., 2",
              min: "0",
              step: "1"
            })
          ),
          React.createElement("div", { className: "flex justify-end space-x-4 pt-4" },
            React.createElement("button", {
              type: "button",
              onClick: onClose,
              className: "px-6 py-2 rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors"
            },
              "Cancel"
            ),
            React.createElement("button", {
              type: "submit",
              className: "px-6 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            },
              "Add Cable"
            )
          )
        )
      )
    )
  );
};

export default CableDetailsModal;
