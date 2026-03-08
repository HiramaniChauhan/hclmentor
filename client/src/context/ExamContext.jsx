import { createContext, useContext, useState } from 'react';

const ExamContext = createContext({ examActive: false, setExamActive: () => { } });

export function ExamProvider({ children }) {
    const [examActive, setExamActive] = useState(false);
    return (
        <ExamContext.Provider value={{ examActive, setExamActive }}>
            {children}
        </ExamContext.Provider>
    );
}

export function useExam() {
    return useContext(ExamContext);
}
