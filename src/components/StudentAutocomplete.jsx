/**
 * StudentAutocomplete - Recherche d'élèves style Instagram
 * Affiche une dropdown de suggestions en temps réel
 */

import React, { useState, useEffect, useRef } from 'react';
import './StudentAutocomplete.css';

export default function StudentAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder = "Tapez un nom...",
    className = ""
}) {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Load students on mount (from cache or API)
    useEffect(() => {
        const loadStudents = async () => {
            setLoading(true);
            try {
                // Try cache first
                const cached = localStorage.getItem('students_cache');
                if (cached) {
                    const { data } = JSON.parse(cached);
                    if (Array.isArray(data) && data.length > 0) {
                        setAllStudents(data);
                        setLoading(false);
                        return;
                    }
                }

                // Fallback: load from repository
                const { studentRepository } = await import('../services/studentRepository');
                const students = await studentRepository.getAllStudents();
                setAllStudents(students || []);
            } catch (err) {
                console.error('Failed to load students for autocomplete:', err);
            } finally {
                setLoading(false);
            }
        };
        loadStudents();
    }, []);

    // Filter students based on query
    useEffect(() => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        const q = query.toLowerCase();
        const filtered = allStudents.filter(s => {
            const fullName = `${s.class_label || ''} ${s.last_name || ''} ${s.first_name || ''}`.toLowerCase();
            const reverseName = `${s.last_name || ''} ${s.first_name || ''}`.toLowerCase();
            return fullName.includes(q) || reverseName.includes(q);
        }).slice(0, 8); // Limit to 8 suggestions

        setSuggestions(filtered);
    }, [query, allStudents]);

    // Handle input change
    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        onChange?.(val);
        setShowDropdown(true);
        setSelectedIndex(-1);
    };

    // Handle selection
    const handleSelect = (student) => {
        const formatted = `${student.class_label} ${student.last_name} ${student.first_name}`;
        setQuery(formatted);
        onChange?.(formatted);
        onSelect?.(student);
        setShowDropdown(false);
    };

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (!showDropdown || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[selectedIndex]);
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`student-autocomplete ${className}`}>
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => query.length >= 2 && setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoComplete="off"
            />

            {showDropdown && suggestions.length > 0 && (
                <div className="autocomplete-dropdown" ref={dropdownRef}>
                    {suggestions.map((student, idx) => (
                        <div
                            key={student.id || idx}
                            className={`autocomplete-item ${idx === selectedIndex ? 'selected' : ''}`}
                            onClick={() => handleSelect(student)}
                        >
                            <span className="item-class">{student.class_label}</span>
                            <span className="item-name">{student.last_name} {student.first_name}</span>
                        </div>
                    ))}
                </div>
            )}

            {showDropdown && query.length >= 2 && suggestions.length === 0 && !loading && (
                <div className="autocomplete-dropdown">
                    <div className="autocomplete-empty">Aucun élève trouvé</div>
                </div>
            )}

            {loading && query.length >= 2 && (
                <div className="autocomplete-dropdown">
                    <div className="autocomplete-loading">Chargement...</div>
                </div>
            )}
        </div>
    );
}
