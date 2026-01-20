"use client"
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { useEffect } from 'react';

export default function PwaElementsLoader() {
    useEffect(() => {
        defineCustomElements(window);
    }, []);
    return null;
}
