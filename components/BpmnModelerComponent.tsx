'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import { emptyBpmn } from '@/lib/empty-bpmn';

export interface BpmnModelerRef {
  importXML: (xml: string) => Promise<void>;
  exportXML: () => Promise<string>;
  exportSVG: () => Promise<string>;
}

interface BpmnModelerComponentProps {
  initialXml?: string;
  onChange?: (xml: string) => void;
}

const BpmnModelerComponent = forwardRef<BpmnModelerRef, BpmnModelerComponentProps>(
  ({ initialXml, onChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const modelerRef = useRef<BpmnModeler | null>(null);

    useImperativeHandle(ref, () => ({
      importXML: async (xml: string) => {
        if (modelerRef.current) {
          try {
            await modelerRef.current.importXML(xml);
            const canvas = modelerRef.current.get('canvas') as any;
            canvas.zoom('fit-viewport');
          } catch (err) {
            console.error('Error importing XML', err);
            throw err;
          }
        }
      },
      exportXML: async () => {
        if (modelerRef.current) {
          const { xml } = await modelerRef.current.saveXML({ format: true });
          return xml || '';
        }
        return '';
      },
      exportSVG: async () => {
        if (modelerRef.current) {
          const { svg } = await modelerRef.current.saveSVG();
          return svg || '';
        }
        return '';
      }
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      const modeler = new BpmnModeler({
        container: containerRef.current
      });

      modelerRef.current = modeler;

      const loadInitialDiagram = async () => {
        try {
          await modeler.importXML(initialXml || emptyBpmn);
          const canvas = modeler.get('canvas') as any;
          canvas.zoom('fit-viewport');
        } catch (err) {
          console.error('Could not import BPMN 2.0 diagram', err);
        }
      };

      loadInitialDiagram();

      modeler.on('commandStack.changed', async () => {
        if (onChange) {
          try {
            const { xml } = await modeler.saveXML({ format: true });
            if (xml) {
              onChange(xml);
            }
          } catch (err) {
            console.error('Error saving XML', err);
          }
        }
      });

      return () => {
        modeler.destroy();
      };
    }, []); // Empty dependency array means it runs once on mount

    return (
      <div 
        ref={containerRef} 
        className="w-full h-full bg-white"
        style={{ minHeight: '600px' }}
      />
    );
  }
);

BpmnModelerComponent.displayName = 'BpmnModelerComponent';

export default BpmnModelerComponent;
