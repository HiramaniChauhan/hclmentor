/**
 * Practice Page
 * Wraps TestGenerator — uses overflow-hidden so the full-window test
 * can take over the entire viewport without a scrollbar.
 */

import TestGenerator from '../components/TestGenerator';

export default function Practice() {
    return (
        <div className="min-h-[calc(100vh-72px)]">
            <TestGenerator />
        </div>
    );
}
