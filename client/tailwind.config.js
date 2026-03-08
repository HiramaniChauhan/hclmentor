/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                // HCL Institute logo colors — orange primary, teal secondary, maroon accent
                brand: {
                    50: '#e6f4f5',
                    100: '#c2e6e8',
                    200: '#85cdd1',
                    300: '#4db8bc',
                    400: '#1fa0a5',
                    500: '#0d7377',   // primary dark teal
                    600: '#0a5c60',
                    700: '#084549',
                    800: '#052e31',
                    900: '#031a1c',
                    950: '#010e0f',
                },
            },
        },
    },
    plugins: [],
};
