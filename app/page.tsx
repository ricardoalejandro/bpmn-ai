'use client';

import { useState, useRef, useEffect } from 'react';
import BpmnModelerComponent, { BpmnModelerRef } from '@/components/BpmnModelerComponent';
import { Download, Upload, Wand2, FileJson, Image as ImageIcon, Loader2, Play, Send } from 'lucide-react';
import { emptyBpmn } from '@/lib/empty-bpmn';
import { GoogleGenAI } from '@google/genai';

type Message = {
  role: 'user' | 'model';
  text: string;
  isXml?: boolean;
};

export default function Home() {
  const modelerRef = useRef<BpmnModelerRef>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSession, setChatSession] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showConfirmNew, setShowConfirmNew] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleNewDiagram = async () => {
    try {
      await modelerRef.current?.importXML(emptyBpmn);
      setMessages([]);
      setChatSession(null);
      setShowConfirmNew(false);
    } catch (err) {
      console.error('Failed to create new diagram', err);
    }
  };

  const handleExportXML = async () => {
    if (!modelerRef.current) return;
    try {
      const xml = await modelerRef.current.exportXML();
      const blob = new Blob([xml], { type: 'application/bpmn20-xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.bpmn';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export XML failed', err);
    }
  };

  const handleExportSVG = async () => {
    if (!modelerRef.current) return;
    try {
      const svg = await modelerRef.current.exportSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.svg';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export SVG failed', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !modelerRef.current) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const xml = event.target?.result as string;
      if (xml) {
        try {
          await modelerRef.current?.importXML(xml);
        } catch (err) {
          console.error('Import XML failed', err);
          alert('Failed to import BPMN file. Please ensure it is a valid BPMN 2.0 XML.');
        }
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const initChat = () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      alert('API key not configured. Please ensure your secret is named exactly "NEXT_PUBLIC_GEMINI_API_KEY" in the Settings > Secrets menu.');
      return;
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `You are an expert BPMN 2.0 architect. Your goal is to help the user design a business process.
1. First, chat with the user to understand the process. Ask clarifying questions about actors, tasks, gateways, and events.
2. Ensure you understand who the participants are so you can create a proper BPMN Pool/Lane structure (Collaboration).
3. Once the process is clear, or when the user explicitly asks you to generate the diagram, provide the BPMN 2.0 XML.
4. When providing the XML, you MUST wrap it in \`\`\`xml ... \`\`\` blocks.
5. The XML MUST include a <bpmn:collaboration> and <bpmn:participant> (Pool) structure.
6. Include <bpmndi:BPMNDiagram> with basic layout.

Example structure:
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="Customer" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Do Work">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="100" y="50" width="600" height="250" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="402" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="402" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

    const session = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    });
    
    setChatSession(session);
    setMessages([{ 
      role: 'model', 
      text: 'Hello! I am your BPMN architect. What kind of business process would you like to model today? I will ask a few questions to understand the participants and steps before generating the diagram.' 
    }]);
  };

  const toggleAiPanel = () => {
    if (!showAiModal) {
      if (!chatSession) {
        initChat();
      }
      setShowAiModal(true);
    } else {
      setShowAiModal(false);
    }
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || !chatSession || !modelerRef.current) return;
    
    const userMsg = prompt.trim();
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsGenerating(true);
    
    try {
      // Add an empty model message placeholder that we will update as the stream comes in
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      const responseStream = await chatSession.sendMessageStream({ message: userMsg });
      let fullText = '';
      
      for await (const chunk of responseStream) {
        const chunkText = chunk.text || '';
        fullText += chunkText;
        
        // Update the last message progressively
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          return newMessages;
        });
      }
      
      // Check if it contains XML after the stream is complete
      const xmlMatch = fullText.match(/```xml\n([\s\S]*?)\n```/) || fullText.match(/```\n([\s\S]*?)\n```/);
      
      if (xmlMatch && xmlMatch[1]) {
        const xml = xmlMatch[1];
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText.replace(xmlMatch[0], '\n\n*[Diagram Generated and Applied to Canvas]*\n\n');
          newMessages[newMessages.length - 1].isXml = true;
          return newMessages;
        });
        await modelerRef.current.importXML(xml);
      }
    } catch (err) {
      console.error('Chat error', err);
      setMessages(prev => {
        const newMessages = [...prev];
        // If the last message was our empty placeholder, replace it with the error
        if (newMessages[newMessages.length - 1].role === 'model' && newMessages[newMessages.length - 1].text === '') {
          newMessages[newMessages.length - 1].text = 'Sorry, I encountered an error. Please try again.';
        } else {
          newMessages.push({ role: 'model', text: 'Sorry, I encountered an error. Please try again.' });
        }
        return newMessages;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header / Toolbar */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
            B
          </div>
          <h1 className="font-semibold text-lg tracking-tight">BPMN Studio Pro</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowConfirmNew(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors"
          >
            <FileJson className="w-4 h-4" />
            New
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button 
            onClick={toggleAiPanel}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-sm font-medium transition-colors border border-indigo-200"
          >
            <Wand2 className="w-4 h-4" />
            AI Architect
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          
          <label className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Open
            <input 
              type="file" 
              accept=".bpmn,.xml" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
          
          <button 
            onClick={handleExportXML}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors"
          >
            <FileJson className="w-4 h-4" />
            Save XML
          </button>
          
          <button 
            onClick={handleExportSVG}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            Export SVG
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative bg-slate-100">
        <div className="absolute inset-0">
          <BpmnModelerComponent ref={modelerRef} />
        </div>
      </main>

      {/* AI Chat Panel */}
      {showAiModal && (
        <div className="absolute top-0 right-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col z-20 animate-in slide-in-from-right duration-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              AI Architect
            </h2>
            <button 
              onClick={() => setShowAiModal(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex items-start">
                <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Describe your process..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={isGenerating || !prompt.trim()}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm New Modal */}
      {showConfirmNew && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Create New Diagram?</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to create a new diagram? Any unsaved changes will be lost, and the AI chat history will be cleared.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmNew(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNewDiagram}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Yes, Create New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
