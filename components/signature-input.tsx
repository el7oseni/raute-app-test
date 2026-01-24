'use client'

import React, { useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface SignatureInputProps {
    onEnd: (dataUrl: string | null) => void
}

export default function SignatureInput({ onEnd }: SignatureInputProps) {
    const sigPad = useRef<SignatureCanvas>(null)

    return (
        <SignatureCanvas
            ref={sigPad}
            penColor="black"
            canvasProps={{
                className: 'sig-canvas w-full h-32 rounded-lg cursor-crosshair',
            }}
            onEnd={() => {
                if (sigPad.current) {
                    onEnd(sigPad.current.getTrimmedCanvas().toDataURL('image/png'))
                }
            }}
        />
    )
}
