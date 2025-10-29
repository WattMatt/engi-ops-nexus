import React, { useState, useEffect } from 'react';

const ScaleModal = ({ isOpen, onClose, onSubmit }) => {
  const [distance, setDistance] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDistance('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const numDistance = parseFloat(distance);
    if (!isNaN(numDistance) && numDistance > 0) {
      onSubmit(numDistance);
    } else {
      alert('Please enter a valid positive number.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" },
      React.createElement("div", { className: "bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md" },
        React.createElement("h2", { className: "text-2xl font-bold text-white mb-4" }, "Set Drawing Scale"),
        React.createElement("p", { className: "text-gray-400 mb-6" }, "Enter the real-world length for the line you just drew to calibrate the scale."),
        React.createElement("form", { onSubmit: handleSubmit },
          React.createElement("div", { className: "mb-4" },
            React.createElement("label", { htmlFor: "distance", className: "block text-sm font-medium text-gray-300 mb-2" },
              "Length (in meters)"
            ),
            React.createElement("input", {
              type: "number",
              id: "distance",
              value: distance,
              onChange: (e) => setDistance(e.target.value),
              className: "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500",
              placeholder: "e.g., 10.5",
              autoFocus: true,
              step: "any"
            })
          ),
          React.createElement("div", { className: "flex justify-end space-x-4 mt-8" },
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
              "Set Scale"
            )
          )
        )
      )
    )
  );
};

export default ScaleModal;
