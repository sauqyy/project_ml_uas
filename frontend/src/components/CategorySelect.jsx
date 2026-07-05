import React, { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';

export default function CategorySelect({ value, onChange, categories, onAddCategory, onDeleteCategory }) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const containerRef = useRef(null);

    // Sync input value with external value
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter categories based on input
    const filteredCategories = categories.filter(cat =>
        cat.toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleKeyDown = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            
            const trimmed = inputValue.trim();
            if (!trimmed) return;

            // Check if it already exists (case-insensitive)
            const exists = categories.find(c => c.toLowerCase() === trimmed.toLowerCase());
            if (exists) {
                onChange(exists);
                setIsOpen(false);
            } else {
                // Add new category
                try {
                    const newCatName = await onAddCategory(trimmed);
                    onChange(newCatName);
                    setIsOpen(false);
                } catch (err) {
                    alert(err.message);
                }
            }
        }
    };

    const handleSelect = (cat) => {
        onChange(cat);
        setIsOpen(false);
    };

    const handleDelete = async (e, cat) => {
        e.stopPropagation(); // Prevent selecting the category when clicking delete
        const confirmDelete = window.confirm(`Are you sure you want to delete category "${cat}"?\n\nNote: Expenses already using this category will not be deleted, but their category will be reset.`);
        if (confirmDelete) {
            try {
                await onDeleteCategory(cat);
                if (value === cat) {
                    onChange(categories.filter(c => c !== cat)[0] || '');
                }
            } catch (err) {
                alert("Failed to delete category: " + err.message);
            }
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative flex items-center">
                <input
                    type="text"
                    className="form-input"
                    placeholder="Type category..."
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    required
                />
            </div>

            {isOpen && (
                <div className="category-dropdown-list">
                    {filteredCategories.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400 text-center">
                            Press Enter to add "{inputValue}"
                        </div>
                    ) : (
                        filteredCategories.map((cat) => (
                            <div
                                key={cat}
                                className={`category-dropdown-item ${value === cat ? 'active' : ''}`}
                                onClick={() => handleSelect(cat)}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => handleDelete(e, cat)}
                                    className="category-delete-btn"
                                    title="Delete category"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <span className="flex-1">{cat}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
