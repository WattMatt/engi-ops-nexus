import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Clipboard, Check, AlertTriangle, Loader } from 'lucide-react';
import { generateBoqFromData } from '../utils/gemini';
import { EquipmentItem, SupplyLine, Containment, SupplyZone } from '../types';

interface BoqModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: {
    equipment: EquipmentItem[];
    lines: SupplyLine[];
    containment: Containment[];
    zones: SupplyZone[];
  };
}

const BoqModal: React.FC<BoqModalProps> = ({ isOpen, onClose, projectData }) => {
    const [boqContent, setBoqContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const handleGenerateBoq = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setBoqContent('');
        try {
            const content = await generateBoqFromData(projectData);
            setBoqContent(content);
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    }, [projectData]);

    useEffect(() => {
        if (isOpen) {
            handleGenerateBoq();
        }
    }, [isOpen, handleGenerateBoq]);

    const handleCopy = () => {
        navigator.clipboard.writeText(boqContent);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity duration-300">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-700">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="text-indigo-400" />
                        AI Generated Bill of Quantities
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg flex-grow overflow-y-auto min-h-[300px]">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Loader className="animate-spin h-10 w-10 mb-4" />
                            <p className="text-lg">Generating your BoQ...</p>
                            <p className="text-sm">Please wait, the AI is analyzing your design.</p>
                        </div>
                    )}
                    {error && (
                        <div className="flex flex-col items-center justify-center h-full text-red-400">
                            <AlertTriangle className="h-10 w-10 mb-4" />
                            <p className="text-lg font-semibold">Generation Failed</p>
                            <p className="text-sm text-center max-w-md">{error}</p>
                        </div>
                    )}
                    {boqContent && (
                        <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                             <pre className="whitespace-pre-wrap break-words font-sans bg-transparent p-0">{boqContent}</pre>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-4 mt-4 flex-shrink-0">
                    {boqContent && (
                        <button
                            onClick={handleCopy}
                            className="px-5 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            {isCopied ? <Check size={18} /> : <Clipboard size={18} />}
                            {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BoqModal;