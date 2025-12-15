import { useState } from 'react';

export default function AudioguideManusGenerator() {
  const [step, setStep] = useState('input');
  const [textSections, setTextSections] = useState([]);
  const [files, setFiles] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [targetAudience, setTargetAudience] = useState('adult');
  const [sectionCount, setSectionCount] = useState({ type: 'exact', value: 3, min: 3, max: 7 });
  const [sectionLength, setSectionLength] = useState({ type: 'exact', minutes: 3, seconds: 0, minMinutes: 2, maxMinutes: 5 });
  const [themeMode, setThemeMode] = useState(null);
  const [themes, setThemes] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [generatedManuscript, setGeneratedManuscript] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const addTextSection = () => {
    setTextSections([...textSections, { id: Date.now(), content: '', comment: '' }]);
  };

  const updateTextSection = (id, field, value) => {
    setTextSections(textSections.map(section => 
      section.id === id ? { ...section, [field]: value } : section
    ));
  };

  const removeTextSection = (id) => {
    setTextSections(textSections.filter(section => section.id !== id));
  };

  const addFiles = (newFiles) => {
    const filesArray = Array.from(newFiles).map(file => ({
      id: Date.now() + Math.random(),
      file,
      comment: ''
    }));
    setFiles([...files, ...filesArray]);
  };

  const updateFileComment = (id, comment) => {
    setFiles(files.map(f => f.id === id ? { ...f, comment } : f));
  };

  const removeFile = (id) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const addAudioFiles = (newFiles) => {
    const filesArray = Array.from(newFiles).map(file => ({
      id: Date.now() + Math.random(),
      file,
      comment: ''
    }));
    setAudioFiles([...audioFiles, ...filesArray]);
  };

  const updateAudioComment = (id, comment) => {
    setAudioFiles(audioFiles.map(f => f.id === id ? { ...f, comment } : f));
  };

  const removeAudioFile = (id) => {
    setAudioFiles(audioFiles.filter(f => f.id !== id));
  };

  const generateThemeProposals = async () => {
    setIsGeneratingThemes(true);
    
    try {
      let sourceMaterial = "# KÄLLMATERIAL\n\n";
      
      if (textSections.length > 0) {
        sourceMaterial += "## Texter:\n";
        textSections.forEach((section, i) => {
          sourceMaterial += `\n### Text ${i + 1}${section.comment ? ` (${section.comment})` : ''}:\n${section.content}\n`;
        });
      }
      
      if (files.length > 0) {
        sourceMaterial += "\n## Bifogade filer:\n";
        files.forEach((file) => {
          sourceMaterial += `- ${file.file.name}${file.comment ? `: ${file.comment}` : ''}\n`;
        });
      }
      
      if (audioFiles.length > 0) {
        sourceMaterial += "\n## Ljudfiler:\n";
        audioFiles.forEach((audio) => {
          sourceMaterial += `- ${audio.file.name}${audio.comment ? `: ${audio.comment}` : ''}\n`;
        });
      }

      const count = sectionCount.type === 'exact' ? sectionCount.value : Math.floor((sectionCount.min + sectionCount.max) / 2);
      
      const systemPrompt = `Du är expert på audioguides för svenska museer. Analysera källmaterial och föreslå teman.`;
      
      let userPrompt = `Baserat på källmaterialet, föreslå ${count} teman för en audioguide.

${sourceMaterial}

MÅLGRUPP: ${targetAudience === 'adult' ? 'Vuxna' : 'Barn'}
`;

      if (aiPrompt.trim()) {
        userPrompt += `\nINSTRUKTIONER: ${aiPrompt}\n`;
      }

      userPrompt += `\nSvara ENDAST med JSON-array: ["Tema 1", "Tema 2", ...]`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        })
      });

      const data = await response.json();
      const content = data.content[0].text;
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Kunde inte hitta JSON");
      
      const themeStrings = JSON.parse(jsonMatch[0]);
      setThemes(themeStrings.map((title, i) => ({ id: i + 1, title, approved: false })));
    } catch (error) {
      alert('Fel: ' + error.message);
    } finally {
      setIsGeneratingThemes(false);
    }
  };

  const updateTheme = (id, title) => {
    setThemes(themes.map(theme => 
      theme.id === id ? { ...theme, title } : theme
    ));
  };

  const toggleThemeApproval = (id) => {
    setThemes(themes.map(theme => 
      theme.id === id ? { ...theme, approved: !theme.approved } : theme
    ));
  };

  const generateManuscript = async () => {
    setIsGenerating(true);
    setStep('generate');
    
    try {
      let sourceMaterial = "# KÄLLMATERIAL\n\n";
      
      if (textSections.length > 0) {
        sourceMaterial += "## Texter:\n";
        textSections.forEach((section, i) => {
          sourceMaterial += `\n### Text ${i + 1}${section.comment ? ` (${section.comment})` : ''}:\n${section.content}\n`;
        });
      }
      
      if (files.length > 0) {
        sourceMaterial += "\n## Bifogade filer:\n";
        files.forEach((file) => {
          sourceMaterial += `- ${file.file.name}${file.comment ? `: ${file.comment}` : ''}\n`;
        });
      }
      
      if (audioFiles.length > 0) {
        sourceMaterial += "\n## Ljudfiler:\n";
        audioFiles.forEach((audio) => {
          sourceMaterial += `- ${audio.file.name}${audio.comment ? `: ${audio.comment}` : ''}\n`;
        });
      }

      const lengthDesc = sectionLength.type === 'exact' 
        ? `exakt ${sectionLength.minutes}:${String(sectionLength.seconds).padStart(2, '0')}`
        : `${sectionLength.minMinutes}-${sectionLength.maxMinutes} minuter`;

      const sections = [];
      
      for (let i = 0; i < themes.length; i++) {
        const theme = themes[i];
        
        const userPrompt = `Skriv audioguide-manus för:

AVSNITT ${i + 1}: ${theme.title}

${sourceMaterial}

MÅLGRUPP: ${targetAudience === 'adult' ? 'Vuxna' : 'Barn (8-12 år, enkelt språk)'}
LÄNGD: ${lengthDesc}

FORMAT:
## MANUS
[Flytande text för inläsning]

## LJUDPÅLÄGG  
[MM:SS - START/STOPP: beskrivning]

## RÖST
[Beskrivning av berättarröst]`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            system: "Du är expert på audioguide-manus för svenska museer.",
            messages: [{ role: "user", content: userPrompt }],
          })
        });

        const data = await response.json();
        const content = data.content[0].text;
        
        const manuscriptMatch = content.match(/## MANUS\s*([\s\S]*?)(?=## LJUDPÅLÄGG|## RÖST|$)/);
        const audioMatch = content.match(/## LJUDPÅLÄGG\s*([\s\S]*?)(?=## RÖST|$)/);
        const voiceMatch = content.match(/## RÖST\s*([\s\S]*)$/);
        
        const manuscriptText = manuscriptMatch ? manuscriptMatch[1].trim() : content;
        const audioText = audioMatch ? audioMatch[1].trim() : '';
        const voiceText = voiceMatch ? voiceMatch[1].trim() : 'Professionell berättarröst';
        
        const audioOverlay = [];
        if (audioText) {
          const lines = audioText.split('\n').filter(line => line.trim());
          lines.forEach(line => {
            const match = line.match(/(\d{2}:\d{2})\s*-\s*(START|STOPP):\s*(.+)/i);
            if (match) {
              audioOverlay.push({
                timestamp: match[1],
                type: match[2].toLowerCase().includes('start') ? 'start' : 'stop',
                description: match[3].trim()
              });
            }
          });
        }
        
        sections.push({
          id: i + 1,
          theme: theme.title,
          content: manuscriptText,
          audioOverlay,
          narratorVoice: voiceText,
          estimatedLength: sectionLength.type === 'exact' 
            ? `${sectionLength.minutes}:${String(sectionLength.seconds).padStart(2, '0')}`
            : `${sectionLength.minMinutes}-${sectionLength.maxMinutes} min`
        });
      }
      
      setGeneratedManuscript({ sections });
      setStep('result');
    } catch (error) {
      alert('Fel: ' + error.message);
      setStep('themes');
    } finally {
      setIsGenerating(false);
    }
  };

  if (step === 'input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">🎵 Audioguide Manus-Generator</h1>
              <p className="text-gray-600">Steg 1 av 4: Lägg till källmaterial</p>
            </div>

            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">📝 Textunderlag</h2>
                <p className="text-sm text-gray-600">Klistra in texter om besöksmålet</p>
              </div>

              {textSections.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-5xl mb-2">📄</p>
                  <p className="text-gray-500 mb-4">Inga texter tillagda än</p>
                  <button
                    onClick={addTextSection}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg"
                  >
                    ➕ Lägg till första texten
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {textSections.map((section, index) => (
                      <div key={section.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-700">Text {index + 1}</span>
                          <button onClick={() => removeTextSection(section.id)} className="text-red-600 hover:text-red-700 text-xl">
                            ✕
                          </button>
                        </div>
                        <textarea
                          value={section.content}
                          onChange={(e) => updateTextSection(section.id, 'content', e.target.value)}
                          placeholder="Klistra in text här..."
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-3 text-sm"
                        />
                        <input
                          type="text"
                          value={section.comment}
                          onChange={(e) => updateTextSection(section.id, 'comment', e.target.value)}
                          placeholder="Din kommentar (t.ex. 'Från broschyr 2023')"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={addTextSection}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg"
                    >
                      ➕ Lägg till ny text
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">📎 Filer</h2>
                <p className="text-sm text-gray-600">PDF, Word, bilder, etc.</p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={(e) => addFiles(e.target.files)}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <p className="text-5xl mb-2">📁</p>
                  <p className="text-gray-600 font-medium">Klicka för att välja filer</p>
                  <p className="text-xs text-gray-500 mt-1">PDF, Word, bilder</p>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-3 mt-4">
                  {files.map((file) => (
                    <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📄</span>
                          <span className="font-medium text-gray-700">{file.file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-red-600 hover:text-red-700 text-xl"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        value={file.comment}
                        onChange={(e) => updateFileComment(file.id, e.target.value)}
                        placeholder="Kommentar (t.ex. 'Boken från 1978')"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">🎤 Ljudfiler</h2>
                <p className="text-sm text-gray-600">Läggs till i källmaterial</p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="audio/*"
                  onChange={(e) => addAudioFiles(e.target.files)}
                  className="hidden"
                  id="audio-upload"
                />
                <label htmlFor="audio-upload" className="cursor-pointer">
                  <p className="text-5xl mb-2">🎵</p>
                  <p className="text-gray-600 font-medium">Klicka för att välja ljudfiler</p>
                  <p className="text-xs text-gray-500 mt-1">MP3, WAV, M4A</p>
                </label>
              </div>

              {audioFiles.length > 0 && (
                <div className="space-y-3 mt-4">
                  {audioFiles.map((audio) => (
                    <div key={audio.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎵</span>
                          <span className="font-medium text-gray-700">{audio.file.name}</span>
                        </div>
                        <button
                          onClick={() => removeAudioFile(audio.id)}
                          className="text-red-600 hover:text-red-700 text-xl"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        value={audio.comment}
                        onChange={(e) => updateAudioComment(audio.id, e.target.value)}
                        placeholder="Kommentar (t.ex. 'Intervju med guide')"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                ✨ <strong>MED RIKTIG AI!</strong> Ju mer källmaterial du lägger till, desto bättre blir manuset!
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep('settings')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold"
              >
                Nästa: Inställningar →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <button onClick={() => setStep('input')} className="text-indigo-600 hover:text-indigo-700 mb-4">
                ← Tillbaka
              </button>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Inställningar</h1>
              <p className="text-gray-600">Steg 2 av 4</p>
            </div>

            <div className="mb-8">
              <label className="block text-lg font-bold text-gray-800 mb-4">Målgrupp</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTargetAudience('adult')}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    targetAudience === 'adult' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">👤</div>
                  <div className="font-bold text-xl">Vuxna</div>
                </button>
                <button
                  onClick={() => setTargetAudience('child')}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    targetAudience === 'child' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">👶</div>
                  <div className="font-bold text-xl">Barn</div>
                </button>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-lg font-bold text-gray-800 mb-4">Antal avsnitt</label>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setSectionCount({ ...sectionCount, type: 'exact' })}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    sectionCount.type === 'exact' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Exakt antal</div>
                </button>
                <button
                  onClick={() => setSectionCount({ ...sectionCount, type: 'range' })}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    sectionCount.type === 'range' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Spann</div>
                </button>
              </div>

              {sectionCount.type === 'exact' ? (
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={sectionCount.value}
                  onChange={(e) => setSectionCount({ ...sectionCount, value: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minst</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={sectionCount.min}
                      onChange={(e) => setSectionCount({ ...sectionCount, min: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={sectionCount.max}
                      onChange={(e) => setSectionCount({ ...sectionCount, max: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8">
              <label className="block text-lg font-bold text-gray-800 mb-4">Längd per avsnitt</label>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setSectionLength({ ...sectionLength, type: 'exact' })}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    sectionLength.type === 'exact' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Exakt längd</div>
                </button>
                <button
                  onClick={() => setSectionLength({ ...sectionLength, type: 'range' })}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    sectionLength.type === 'range' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Spann</div>
                </button>
              </div>

              {sectionLength.type === 'exact' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minuter</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={sectionLength.minutes}
                      onChange={(e) => setSectionLength({ ...sectionLength, minutes: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sekunder</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={sectionLength.seconds}
                      onChange={(e) => setSectionLength({ ...sectionLength, seconds: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min minuter</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={sectionLength.minMinutes}
                      onChange={(e) => setSectionLength({ ...sectionLength, minMinutes: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max minuter</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={sectionLength.maxMinutes}
                      onChange={(e) => setSectionLength({ ...sectionLength, maxMinutes: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep('themes')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold"
              >
                Nästa: Välj teman →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'themes') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <button onClick={() => setStep('settings')} className="text-indigo-600 hover:text-indigo-700 mb-4">
                ← Tillbaka
              </button>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Välj teman</h1>
              <p className="text-gray-600">Steg 3 av 4</p>
            </div>

            {!themeMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => {
                    setThemeMode('manual');
                    const count = sectionCount.type === 'exact' ? sectionCount.value : Math.floor((sectionCount.min + sectionCount.max) / 2);
                    setThemes(Array.from({ length: count }, (_, i) => ({
                      id: i + 1,
                      title: '',
                      approved: true
                    })));
                  }}
                  className="p-8 rounded-lg border-2 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 text-left"
                >
                  <div className="text-5xl mb-4">✍️</div>
                  <h3 className="text-xl font-bold mb-2">Skriv själv</h3>
                  <p className="text-gray-600">Du skriver alla teman manuellt</p>
                  <p className="text-xs text-gray-500 mt-2">({sectionCount.type === 'exact' ? sectionCount.value : `${sectionCount.min}-${sectionCount.max}`} avsnitt)</p>
                </button>

                <button
                  onClick={() => setThemeMode('ai')}
                  className="p-8 rounded-lg border-2 border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-left"
                >
                  <div className="text-5xl mb-4">🤖</div>
                  <h3 className="text-xl font-bold mb-2">AI-förslag</h3>
                  <p className="text-gray-600">AI föreslår teman baserat på ditt material</p>
                  <p className="text-xs text-gray-500 mt-2">({sectionCount.type === 'exact' ? sectionCount.value : `${sectionCount.min}-${sectionCount.max}`} avsnitt)</p>
                </button>
              </div>
            ) : themeMode === 'ai' && themes.length === 0 ? (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Särskilda instruktioner (valfritt)
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="T.ex. 'Fokusera på maritim historia' eller 'Betona barnperspektiv'"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setThemeMode(null);
                      setAiPrompt('');
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold"
                  >
                    Tillbaka
                  </button>
                  <button
                    onClick={generateThemeProposals}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold"
                  >
                    ✨ Generera teman
                  </button>
                </div>
              </div>
            ) : (
              <>
                {isGeneratingThemes ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4 animate-pulse">⏳</div>
                    <p className="text-gray-600 font-medium">Genererar teman baserat på ditt material...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-8">
                      {themes.map((theme, index) => (
                        <div key={theme.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">
                              {index + 1}
                            </div>
                            <input
                              type="text"
                              value={theme.title}
                              onChange={(e) => updateTheme(theme.id, e.target.value)}
                              placeholder={`Tema ${index + 1}...`}
                              className="flex-1 px-3 py-2 border rounded-lg"
                            />
                            {themeMode === 'ai' && (
                              <button
                                onClick={() => toggleThemeApproval(theme.id)}
                                className={`px-4 py-2 rounded-lg font-medium ${
                                  theme.approved ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                                }`}
                              >
                                {theme.approved ? '✓' : 'Godkänn'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const allFilled = themes.every(t => t.title.trim());
                          const allApproved = themeMode === 'manual' || themes.every(t => t.approved);
                          
                          if (!allFilled) {
                            alert('Fyll i alla teman');
                            return;
                          }
                          if (!allApproved) {
                            alert('Godkänn alla teman');
                            return;
                          }
                          
                          generateManuscript();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold"
                      >
                        ✨ Generera manus
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'generate') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center py-16">
            <div className="text-6xl mb-6 animate-pulse">✨</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Genererar ditt manus...</h1>
            <p className="text-gray-600">AI analyserar material och skapar manus</p>
            <p className="text-sm text-gray-500 mt-2">Detta kan ta 1-2 minuter...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">✨ Genererat manus</h1>

            <div className="space-y-6">
              {generatedManuscript.sections.map((section) => (
                <div key={section.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b">
                    <h3 className="text-xl font-bold">
                      Avsnitt {section.id}: {section.theme}
                    </h3>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>⏱️ {section.estimatedLength}</span>
                      <span>🎙️ {section.narratorVoice}</span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {section.content}
                    </div>

                    {section.audioOverlay && section.audioOverlay.length > 0 && (
                      <div className="mt-6 pt-6 border-t">
                        <h4 className="font-semibold text-gray-800 mb-3">🎵 Ljudpålägg:</h4>
                        <div className="space-y-2">
                          {section.audioOverlay.map((overlay, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                {overlay.timestamp}
                              </span>
                              <span>{overlay.type === 'start' ? '▶️' : '⏹️'} {overlay.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => {
                  setStep('input');
                  setGeneratedManuscript(null);
                  setTextSections([]);
                  setFiles([]);
                  setAudioFiles([]);
                  setThemes([]);
                  setThemeMode(null);
                  setAiPrompt('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold"
              >
                Starta nytt manus
              </button>
              <button
                onClick={() => setStep('themes')}
                className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-6 py-3 rounded-lg font-semibold"
              >
                Justera teman
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}