/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppState, getInitialState, saveState, recalculateBalances, addAuditLog } from './data/stateManager';
import { User, BoxId, Transaction, WeeklyClosing as ClosingType, Person, UserRole } from './types';
import { 
  Lock, Landmark, ArrowLeftRight, PlusCircle, CalendarRange, 
  Users, BarChart3, History, LogOut, ShieldAlert, FileDown, FileUp, 
  Menu, X, BookOpen, AlertCircle, ShieldCheck
} from 'lucide-react';

// Import our modular subcomponents
import Dashboard from './components/Dashboard';
import BoxesManagement from './components/BoxesManagement';
import TransactionForm from './components/TransactionForm';
import WeeklyClosing from './components/WeeklyClosing';
import RegistrationManagement from './components/RegistrationManagement';
import ReportsView from './components/ReportsView';
import AuditoryView from './components/AuditoryView';
import TransactionReceipt from './components/TransactionReceipt';
import AtaWeeklyClosing from './components/AtaWeeklyClosing';

export default function App() {
  const [state, setState] = useState<AppState>(getInitialState);
  
  // Login input fields
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Google Authentication states
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showGoogleRoleModal, setShowGoogleRoleModal] = useState(false);
  const [googleProfileData, setGoogleProfileData] = useState<{
    id: string;
    name: string;
    email: string;
    picture: string;
  } | null>(null);

  // Shell Layout tab routing
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal overlays
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);
  const [activeAta, setActiveAta] = useState<ClosingType | null>(null);

  // Sync state changes instantly to localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Handle local system backups
  const handleDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `EBD_Backup_Financeiro_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();

    // Log the backup download in audit trail
    const updatedState = { ...state };
    addAuditLog(updatedState, 'Backup de Sistema', 'Efetuou download de arquivo completo de seguranca local.');
    setState(updatedState);
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.users && parsed.boxes && parsed.transactions) {
            const updatedState: AppState = {
              ...parsed,
              currentUser: state.currentUser // Maintain current session
            };
            addAuditLog(updatedState, 'Restauracao de Backup', 'Backup de seguranca local restaurado com sucesso.');
            setState(updatedState);
            alert('Backup restaurado e consolidado com sucesso!');
          } else {
            alert('Arquivo inválido. Formato incompatível com o sistema financeiro EBD.');
          }
        } catch {
          alert('Erro de processamento d arquivo JSON de backup.');
        }
      };
    }
  };

  // Google Authentication GSI Integration
  useEffect(() => {
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            const profile = decodeGoogleJwt(response.credential);
            if (profile) {
              setGoogleProfileData({
                id: profile.sub || `g-${Date.now()}`,
                name: profile.name,
                email: profile.email,
                picture: profile.picture || ''
              });
              setShowGoogleRoleModal(true);
            }
          }
        });
      } catch (err) {
        console.error("Erro ao inicializar Google Sign-In SDK:", err);
      }
    }
  }, [state.currentUser]);

  // Decode GSI JWT ID Token helper
  const decodeGoogleJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT Decode error", e);
      return null;
    }
  };

  // Google Login click handler
  const handleGoogleLoginClick = () => {
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && (window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (response: any) => {
            if (response && response.access_token) {
              try {
                const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${response.access_token}`);
                const profile = await res.json();
                if (profile && profile.name) {
                  setGoogleProfileData({
                    id: profile.sub || `g-${Date.now()}`,
                    name: profile.name,
                    email: profile.email,
                    picture: profile.picture || ''
                  });
                  setShowGoogleRoleModal(true);
                }
              } catch (err) {
                console.error("Erro ao buscar dados do perfil Google:", err);
                setShowSimulationModal(true);
              }
            }
          }
        });
        client.requestAccessToken();
      } catch (err) {
        console.error("Erro Google Token Client:", err);
        setShowSimulationModal(true);
      }
    } else {
      setShowSimulationModal(true);
    }
  };

  const handleSimulateGoogleLogin = (name: string, role: UserRole, email: string) => {
    setShowSimulationModal(false);
    
    const updatedState = { ...state };
    updatedState.currentUser = {
      id: `gsim-${Date.now()}`,
      name: name,
      username: email.split('@')[0],
      role: role,
      avatarColor: role === 'TESOUREIRO' ? 'bg-blue-600' : role === 'SECRETARIA' ? 'bg-indigo-600' : 'bg-emerald-600'
    };

    addAuditLog(updatedState, 'Login Google Simulado', `Acesso via simulador de conta Google (${email}) com permissão de ${role}.`, updatedState.currentUser);
    setState(updatedState);
    
    if (role === 'SECRETARIA') {
      setActiveTab('cadastro');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleConfirmGoogleRole = (role: UserRole) => {
    if (!googleProfileData) return;
    
    setShowGoogleRoleModal(false);
    
    const updatedState = { ...state };
    updatedState.currentUser = {
      id: googleProfileData.id,
      name: googleProfileData.name,
      username: googleProfileData.email.split('@')[0],
      role: role,
      avatarColor: role === 'TESOUREIRO' ? 'bg-blue-600' : role === 'SECRETARIA' ? 'bg-indigo-600' : 'bg-emerald-600'
    };

    addAuditLog(updatedState, 'Login Google Concluido', `Acesso autenticado via Google Sign-In (${googleProfileData.email}) associado ao perfil ${role}.`, updatedState.currentUser);
    setState(updatedState);
    
    setGoogleProfileData(null);
    
    if (role === 'SECRETARIA') {
      setActiveTab('cadastro');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const userObj = state.users.find(
      u => u.username === usernameInput.toLowerCase() && u.passwordHash === passwordInput
    );

    if (userObj) {
      const updatedState = { ...state };
      updatedState.currentUser = {
        id: userObj.id,
        name: userObj.name,
        username: userObj.username,
        role: userObj.role,
        avatarColor: userObj.avatarColor
      };
      
      addAuditLog(updatedState, 'Login efetuado', `Usuario ${userObj.name} ingressou no sistema com perfil ${userObj.role}.`, updatedState.currentUser);
      setState(updatedState);
      
      // Default views based on Role permissions
      if (userObj.role === 'SECRETARIA') {
        setActiveTab('cadastro');
      } else {
        setActiveTab('dashboard');
      }

      // Clear input fields
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError('Credenciais incorretas. Utilize "secretaria/senha123", "dirigente/senha123" ou "tesoureiro/senha123".');
    }
  };

  // Logout handler
  const handleLogout = () => {
    const updatedState = { ...state };
    if (updatedState.currentUser) {
      addAuditLog(updatedState, 'Logout de Usuario', `Usuario ${updatedState.currentUser.name} encerrou a sessao.`);
    }
    updatedState.currentUser = null;
    setState(updatedState);
    setUsernameInput('');
    setPasswordInput('');
    setMobileMenuOpen(false);
  };

  // Transaction submission (Secretary or Treasurer)
  const handleAddTransaction = (data: {
    type: 'ENTRADA' | 'SAIDA';
    boxId: BoxId;
    amount: number;
    date: string;
    categoryId: string;
    description: string;
    signature: string;
  }) => {
    const updatedState = { ...state };
    
    // Generate readable transaction code (eg: TX-1009)
    const lastNum = updatedState.transactions.length > 0
      ? parseInt(updatedState.transactions[0].transactionNum.replace('TX-', ''))
      : 1000;
    const nextCode = `TX-${lastNum + 1}`;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      transactionNum: nextCode,
      type: data.type,
      boxId: data.boxId,
      amount: data.amount,
      date: data.date,
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      categoryId: data.categoryId,
      description: data.description,
      responsible: updatedState.currentUser?.name || 'Tesoureiro',
      signature: data.signature,
      createdAt: new Date().toISOString(),
      isApproved: updatedState.currentUser?.role === 'TESOUREIRO' ? false : false // Requires Dirigente clearance
    };

    // Prepend to transaction array
    updatedState.transactions = [newTx, ...updatedState.transactions];
    
    // Check if the current submitter is 'TESOUREIRO' or 'SECRETARIA' and update logs
    addAuditLog(
      updatedState,
      'Inclusão de Movimentação',
      `Cadastrou ${data.type.toLowerCase()} ${nextCode} de R$ ${data.amount.toFixed(2)} pendente de aprovacao.`
    );

    setState(updatedState);
    setActiveReceipt(newTx); // Automatically trigger Comprovante display!
  };

  // Transaction Visto Approval (Dirigente only)
  const handleApproveTransaction = (txId: string) => {
    const updatedState = { ...state };
    const tx = updatedState.transactions.find(t => t.id === txId);
    
    if (tx && !tx.isApproved) {
      tx.isApproved = true;
      tx.approvedBy = updatedState.currentUser?.name;
      tx.approvedAt = new Date().toISOString();

      // Refresh final balances automatically
      updatedState.boxes = recalculateBalances(updatedState);

      // Audit Log
      addAuditLog(
        updatedState,
        'Aprovação de Movimentação',
        `Aprovou e conciliou o voucher ${tx.transactionNum} no valor de R$ ${tx.amount.toFixed(2)}.`
      );

      setState(updatedState);
    }
  };

  // Fund balance transfer handler
  const handleTransferFunds = (data: {
    fromBox: BoxId;
    toBox: BoxId;
    amount: number;
    description: string;
    signature: string;
  }) => {
    const updatedState = { ...state };
    const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5);
    const dateToday = new Date().toISOString().split('T')[0];

    // Outflow from Box 1
    const lastNum1 = updatedState.transactions.length > 0
      ? parseInt(updatedState.transactions[0].transactionNum.replace('TX-', ''))
      : 1000;
    const txCodeOut = `TX-${lastNum1 + 1}`;
    
    const txOut: Transaction = {
      id: `tx-${Date.now()}-out`,
      transactionNum: txCodeOut,
      type: 'SAIDA',
      boxId: data.fromBox,
      amount: data.amount,
      date: dateToday,
      time: timeNow,
      categoryId: 'cat-sai-6', // Maintenance/Transfer type category placeholder
      description: `[TRANSFERÊNCIA ORIGEM] ${data.description}`,
      responsible: updatedState.currentUser?.name || 'Tesoureiro',
      signature: data.signature,
      createdAt: new Date().toISOString(),
      isApproved: true // Direct transfer is pre-approved by the signatory
    };

    // Inflow to Box 2
    const txIn: Transaction = {
      id: `tx-${Date.now()}-in`,
      transactionNum: `TX-${lastNum1 + 2}`,
      type: 'ENTRADA',
      boxId: data.toBox,
      amount: data.amount,
      date: dateToday,
      time: timeNow,
      categoryId: 'cat-ent-4', // Special donations
      description: `[TRANSFERÊNCIA DESTINO] ${data.description}`,
      responsible: updatedState.currentUser?.name || 'Tesoureiro',
      signature: data.signature,
      createdAt: new Date().toISOString(),
      isApproved: true
    };

    updatedState.transactions = [txIn, txOut, ...updatedState.transactions];
    
    // Recalculate
    updatedState.boxes = recalculateBalances(updatedState);

    // Logging
    addAuditLog(
      updatedState,
      'Transferência de Caixa',
      `Efetuou repasse de R$ ${data.amount.toFixed(2)} de ${data.fromBox === 'CAIXA_5_EBD' ? '5% EBD' : 'Lições'} para ${data.toBox === 'CAIXA_5_EBD' ? '5% EBD' : 'Lições'}.`
    );

    setState(updatedState);
  };

  // Weekly closing drafting handler (Treasurer)
  const handleAddClosing = (data: {
    startDate: string;
    endDate: string;
    totalInflows: number;
    totalOutflows: number;
    startingBalance: number;
    endingBalance: number;
    comments: string;
    treasurerName: string;
    treasurerSignature: string;
  }) => {
    const updatedState = { ...state };
    
    // Code compilation (eg: FECH-2026-W25)
    const code = `FECH-2026-W${Math.floor(Math.random() * (52 - 26 + 1)) + 26}`;

    const newClosing: ClosingType = {
      id: `clos-${Date.now()}`,
      closingNum: code,
      startDate: data.startDate,
      endDate: data.endDate,
      totalInflows: data.totalInflows,
      totalOutflows: data.totalOutflows,
      startingBalance: data.startingBalance,
      endingBalance: data.endingBalance,
      difference: 0,
      status: 'PENDENTE',
      treasurerName: data.treasurerName,
      treasurerSignature: data.treasurerSignature,
      closedAt: new Date().toISOString()
    };

    updatedState.closings = [newClosing, ...updatedState.closings];

    // Logging
    addAuditLog(
      updatedState,
      'Fechamento Semanal',
      `Redigiu fechamento consolidado ${code} pendente de visto pastoral.`
    );

    setState(updatedState);
    setActiveAta(newClosing); // Instantly showcase document!
  };

  // Closing clearance seen (Dirigente only)
  const handleApproveClosing = (idxId: string) => {
    const updatedState = { ...state };
    const closing = updatedState.closings.find(c => c.id === idxId);
    
    if (closing && closing.status === 'PENDENTE') {
      closing.status = 'APROVADO';
      closing.dirigenteApprover = updatedState.currentUser?.id;
      closing.dirigenteApprovedAt = new Date().toISOString();

      // Audit Log
      addAuditLog(
        updatedState,
        'Aprovação de Fechamento',
        `Aprovou e referendou o Fechamento Semanal ${closing.closingNum}.`
      );

      setState(updatedState);
    }
  };

  // Student & Visitor registrant submittals (Secretary or Treasurer)
  const handleAddPerson = (data: {
    name: string;
    type: 'ALUNO' | 'VISITANTE';
    phone?: string;
    classGroup?: string;
  }) => {
    const updatedState = { ...state };

    const newPerson: Person = {
      id: `per-${Date.now()}`,
      name: data.name,
      type: data.type,
      phone: data.phone,
      classGroup: data.classGroup,
      registeredAt: new Date().toISOString().split('T')[0]
    };

    updatedState.people = [newPerson, ...updatedState.people];

    // Log in audit
    addAuditLog(
      updatedState,
      'Cadastro Realizado',
      `Cadastrou o ${data.type.toLowerCase()} "${data.name}" no sistema.`
    );

    setState(updatedState);
  };

  // Session check wrapper
  if (!state.currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
        
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 space-y-4">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl mx-auto flex items-center justify-center font-extrabold tracking-tight text-xl shadow-lg border border-slate-800">
            EBD
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Finanças EBD</h2>
            <p className="mt-1.5 text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
              Sistema de Gestão Financeira Integrada para a Escola Bíblica Dominical.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
          <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-3xl sm:px-10 space-y-6">
            
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3.5 flex items-start gap-2.5 animate-bounce-subtle">
                <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 font-semibold text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-600 uppercase tracking-widest block">Usuário de Acesso</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="secretaria, dirigente ou tesoureiro"
                    className="block w-full border border-slate-200 rounded-xl p-3 sm:text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 uppercase tracking-widest block font-bold">Senha de Segurança</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite a senha de 8 dígitos (padrão: senha123)"
                    className="block w-full border border-slate-200 rounded-xl p-3 sm:text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl py-3.5 text-center font-bold text-xs shadow-md shadow-gray-200 transition-all cursor-pointer active:scale-[0.98] mt-2"
                id="login-btn"
              >
                Ingressar na Sessão EBD
              </button>
            </form>

            {/* Google Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="bg-white px-2.5 text-slate-400 font-bold uppercase tracking-wider">Ou acesse com</span>
              </div>
            </div>

            {/* Google Sign-In Trigger Button */}
            <button
              onClick={handleGoogleLoginClick}
              type="button"
              className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-705 rounded-xl py-3 px-4 font-bold text-[11px] shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24c0-1.63-.15-3.21-.42-4.75H24v9h12.75c-.55 2.87-2.18 5.31-4.62 6.95l7.2 5.58C43.5 36.54 46.5 30.77 46.5 24z"/>
                <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.2-5.58c-2 .35-4.55 2.11-8.69 2.11-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Entrar com o Google</span>
            </button>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                RBAC Ativo
              </span>
              <span>v1.2.0 • Versão de Avaliação</span>
            </div>

          </div>
        </div>

        {/* Visual Component: Simulation Modal overlay */}
        {showSimulationModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-slide-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24c0-1.63-.15-3.21-.42-4.75H24v9h12.75c-.55 2.87-2.18 5.31-4.62 6.95l7.2 5.58C43.5 36.54 46.5 30.77 46.5 24z"/>
                    <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.2-5.58c-2 .35-4.55 2.11-8.69 2.11-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 tracking-tight">Simulador de Login Google</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Como não há Client ID configurado no seu arquivo de configuração <code className="bg-slate-50 border border-slate-100 p-0.5 px-1 font-mono rounded">.env</code> para esta sessão, selecione qual conta cadastrada você deseja simular via Google para experimentar o sistema:
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSimulateGoogleLogin('Marcos Oliveira (Google)', 'TESOUREIRO', 'marcos.ebd@gmail.com')}
                  className="w-full text-left p-3.5 border border-slate-100 hover:border-indigo-200 bg-slate-50 hover:bg-slate-50/20 rounded-2xl flex items-center gap-3 transition-all cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <div className="flex-1 font-semibold text-slate-805">
                    <span className="block font-bold">Marcos Oliveira</span>
                    <span className="text-[10px] text-slate-400 block font-normal">marcos.ebd@gmail.com • Tesoureiro</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateGoogleLogin('Amanda Souza (Google)', 'SECRETARIA', 'amanda.ebd@gmail.com')}
                  className="w-full text-left p-3.5 border border-slate-100 hover:border-indigo-200 bg-slate-50 hover:bg-slate-50/20 rounded-2xl flex items-center gap-3 transition-all cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                  <div className="flex-1 font-semibold text-slate-805">
                    <span className="block font-bold">Amanda Souza</span>
                    <span className="text-[10px] text-slate-400 block font-normal">amanda.ebd@gmail.com • Secretária</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateGoogleLogin('Pr. Carlos Mendes (Google)', 'DIRIGENTE', 'carlos.ebd@gmail.com')}
                  className="w-full text-left p-3.5 border border-slate-100 hover:border-indigo-200 bg-slate-50 hover:bg-slate-50/20 rounded-2xl flex items-center gap-3 transition-all cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="flex-1 font-semibold text-slate-805">
                    <span className="block font-bold">Pr. Carlos Mendes</span>
                    <span className="text-[10px] text-slate-400 block font-normal">carlos.ebd@gmail.com • Dirigente</span>
                  </div>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulationModal(false)}
                  className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-xs cursor-pointer text-center"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visual Component: Real Google Sign-in Role Selection Modal */}
        {showGoogleRoleModal && googleProfileData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-slide-in">
              <div className="text-center space-y-2">
                {googleProfileData.picture ? (
                  <img src={googleProfileData.picture} alt="Avatar" className="w-12 h-12 rounded-full mx-auto border border-indigo-200 shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                    {googleProfileData.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h4 className="font-extrabold text-sm text-slate-800 tracking-tight">Atribuir Cargo de Acesso</h4>
                <p className="text-[11px] text-slate-400 leading-normal col-span-2">
                  Olá, <strong className="text-slate-700">{googleProfileData.name}</strong>! Escolha qual cargo da diretoria da EBD você deseja assumir nesta sessão usando seu login Google.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleConfirmGoogleRole('TESOUREIRO')}
                  className="w-full text-left p-3 border border-slate-150 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50/10 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer font-bold text-slate-800"
                >
                  <div>
                    <span className="block font-bold text-slate-800 text-[11px]">Tesoureiro</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Saldos, estornos e fechamento semanal</span>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmGoogleRole('SECRETARIA')}
                  className="w-full text-left p-3 border border-slate-150 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50/10 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer font-bold text-slate-800"
                >
                  <div>
                    <span className="block font-bold text-slate-800 text-[11px]">Secretária</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Cadastros e preenchimento de lançamentos</span>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmGoogleRole('DIRIGENTE')}
                  className="w-full text-left p-3 border border-slate-150 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50/10 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer font-bold text-slate-800"
                >
                  <div>
                    <span className="block font-bold text-slate-800 text-[11px]">Dirigente Pastoral</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Auditar relatórios e visar financeiro</span>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => { setShowGoogleRoleModal(false); setGoogleProfileData(null); }}
                  className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-xs cursor-pointer text-center"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Active User session context
  const user = state.currentUser;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Visual Navigation Header (Logo, profile selection and manual offline cloud controls) */}
      <nav className="bg-slate-900 border-b border-slate-800 text-white shadow-sm z-30 sticky top-0 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo area */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white text-slate-900 flex items-center justify-center font-black text-sm">
                E
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight leading-none block">Finanças EBD</h1>
                <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest block mt-0.5">Gestão de Caixas</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-xl transition-all ${
                  activeTab === 'dashboard' ? 'bg-slate-800 text-indigo-300' : 'text-slate-350 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab('caixas')}
                className={`px-3 py-2 rounded-xl transition-all ${
                  activeTab === 'caixas' ? 'bg-slate-800 text-indigo-300' : 'text-slate-350 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Caixas
              </button>

              {user.role !== 'VISITANTE' && user.role !== 'DIRIGENTE' && (
                <button
                  onClick={() => setActiveTab('nova_movimentacao')}
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1 ${
                    activeTab === 'nova_movimentacao' ? 'bg-slate-800 text-indigo-300' : 'text-slate-350 hover:bg-slate-800 hover:text-white'
                  }`}
                  id="tab-new-tx"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Nova Movimentação
                </button>
              )}

              <button
                onClick={() => setActiveTab('fechamento')}
                className={`px-3 py-2 rounded-xl transition-all ${
                  activeTab === 'fechamento' ? 'bg-slate-800 text-indigo-300' : 'text-slate-350 hover:bg-slate-800 hover:text-white'
                }`}
                id="tab-closing"
              >
                Fechamento Semanal
              </button>

              <button
                onClick={() => setActiveTab('cadastro')}
                className={`px-3 py-2 rounded-xl transition-all ${
                  activeTab === 'cadastro' ? 'bg-slate-800 text-indigo-300' : 'text-slate-350 hover:bg-slate-800 hover:text-white'
                }`}
                id="tab-registries"
              >
                Alunos & Visitantes
              </button>

              <button
                onClick={() => setActiveTab('relatorios')}
                className={`px-3 py-2 rounded-xl transition-all ${
                  activeTab === 'relatorios' ? 'bg-slate-800 text-indigo-300' : 'text-slate-350 hover:bg-slate-800 hover:text-white'
                }`}
                id="tab-reports"
              >
                Relatórios
              </button>

              <button
                onClick={() => setActiveTab('auditoria')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1 ${
                  activeTab === 'auditoria' ? 'bg-slate-800 text-indigo-300' : 'text-slate-350 hover:bg-slate-800 hover:text-white'
                }`}
                id="tab-audits"
              >
                <History className="w-3.5 h-3.5" />
                Auditoria
              </button>
            </div>

            {/* Profile details & Backup features */}
            <div className="hidden lg:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-750">
                <span className={`w-2 h-2 rounded-full ${user.avatarColor || 'bg-slate-400'}`} />
                <span className="font-extrabold text-[11px] text-slate-100">{user.name}</span>
                <span className="text-[9px] font-black bg-indigo-600 px-1.5 py-0.2 rounded uppercase">
                  {user.role}
                </span>
              </div>
              
              {/* Database sync and download backup row */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="p-1 px-2 hover:bg-indigo-600 rounded bg-indigo-500/10 text-indigo-400 hover:text-white border border-indigo-450/15 duration-100 flex items-center gap-1 font-bold font-mono text-[9px] uppercase tracking-wide cursor-pointer"
                  title="Fazer download de Segurança (Respaldo Completo)"
                >
                  <FileDown className="w-3 h-3" />
                  Backup
                </button>

                <label className="p-1 px-2 hover:bg-slate-850 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white duration-100 flex items-center gap-1 font-bold font-mono text-[9px] uppercase tracking-wide cursor-pointer">
                  <FileUp className="w-3 h-3" />
                  Restaurar
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUploadBackup}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-full hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all flex items-center justify-center"
                title="Sair do Sistema"
                id="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu trigger */}
            <div className="lg:hidden flex items-center gap-3">
              <span className="text-[10px] font-bold bg-indigo-600 px-2 py-0.5 rounded uppercase tracking-wider">{user.role}</span>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 rounded-md hover:bg-slate-800 text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile menu panel dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-850 border-t border-slate-800 px-4 pt-2 pb-4 space-y-2 text-xs font-bold font-sans">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`block w-full text-left py-2 px-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-slate-800 text-indigo-300' : 'text-slate-300'}`}
            >
              Dashboard
            </button>
            
            <button
              onClick={() => { setActiveTab('caixas'); setMobileMenuOpen(false); }}
              className={`block w-full text-left py-2 px-3 rounded-lg ${activeTab === 'caixas' ? 'bg-slate-800 text-indigo-300' : 'text-slate-300'}`}
            >
              Caixas
            </button>

            {user.role !== 'VISITANTE' && user.role !== 'DIRIGENTE' && (
              <button
                onClick={() => { setActiveTab('nova_movimentacao'); setMobileMenuOpen(false); }}
                className={`block w-full text-left py-2 px-3 rounded-lg ${activeTab === 'nova_movimentacao' ? 'bg-slate-800 text-indigo-300' : 'text-slate-300'}`}
              >
                Nova Movimentação
              </button>
            )}

            <button
              onClick={() => { setActiveTab('fechamento'); setMobileMenuOpen(false); }}
              className={`block w-full text-left py-2 px-3 rounded-lg ${activeTab === 'fechamento' ? 'bg-slate-800 text-indigo-300' : 'text-slate-300'}`}
            >
              Fechamento Semanal
            </button>

            <button
              onClick={() => { setActiveTab('cadastro'); setMobileMenuOpen(false); }}
              className={`block w-full text-left py-2 px-3 rounded-lg ${activeTab === 'cadastro' ? 'bg-slate-800 text-indigo-300' : 'text-slate-300'}`}
            >
              Alunos & Visitantes
            </button>

            <button
              onClick={() => { setActiveTab('relatorios'); setMobileMenuOpen(false); }}
              className={`block w-full text-left py-2 px-3 rounded-lg ${activeTab === 'relatorios' ? 'bg-slate-800 text-indigo-300' : 'text-slate-300'}`}
            >
              Relatórios
            </button>

            <button
              onClick={() => { setActiveTab('auditoria'); setMobileMenuOpen(false); }}
              className={`block w-full text-left py-2 px-3 rounded-lg ${activeTab === 'auditoria' ? 'bg-slate-800 text-indigo-300' : 'text-slate-300'}`}
            >
              Auditoria
            </button>

            <div className="border-t border-slate-700 pt-3 flex flex-col gap-2">
              <div className="text-[10px] text-slate-400">Usuário: {user.name} ({user.role})</div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => { handleDownloadBackup(); setMobileMenuOpen(false); }}
                  className="flex-1 py-1 px-3 bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 rounded text-center text-[10px]"
                >
                  Download Backup
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-1 px-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-center text-[10px]"
                >
                  Sair do Sistema
                </button>
              </div>
            </div>

          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Render appropriate segment based on activeTab */}
        <div className="transition-all duration-300">
          
          {activeTab === 'dashboard' && (
            <Dashboard
              boxes={state.boxes}
              transactions={state.transactions}
              onApproveTransaction={handleApproveTransaction}
              onViewTransaction={(tx) => setActiveReceipt(tx)}
              currentUser={user}
              onNavigateToTab={(tabName) => setActiveTab(tabName)}
            />
          )}

          {activeTab === 'caixas' && (
            <BoxesManagement
              boxes={state.boxes}
              transactions={state.transactions}
              categories={state.categories}
              currentUser={user}
              onViewTransaction={(tx) => setActiveReceipt(tx)}
              onTransfer={handleTransferFunds}
            />
          )}

          {activeTab === 'nova_movimentacao' && (
            user.role !== 'VISITANTE' && user.role !== 'DIRIGENTE' ? (
              <TransactionForm
                categories={state.categories}
                onSubmit={handleAddTransaction}
                currentUser={user}
              />
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-auto border border-slate-100">
                <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h4 className="font-bold text-sm text-slate-800">Acesso Restrito</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Desculpe. O preenchimento e lançamento de lançamentos financeiros só é assegurado aos cargos de <strong>Secretária</strong> ou <strong>Tesoureiro</strong>.
                </p>
              </div>
            )
          )}

          {activeTab === 'fechamento' && (
            <WeeklyClosing
              closings={state.closings}
              transactions={state.transactions}
              currentUser={user}
              onViewAta={(closing) => setActiveAta(closing)}
              onAddClosing={handleAddClosing}
              onApproveClosing={handleApproveClosing}
            />
          )}

          {activeTab === 'cadastro' && (
            <RegistrationManagement
              people={state.people}
              currentUser={user}
              onAddPerson={handleAddPerson}
            />
          )}

          {activeTab === 'relatorios' && (
            <ReportsView
              transactions={state.transactions}
              categories={state.categories}
              boxes={state.boxes}
              onViewTransaction={(tx) => setActiveReceipt(tx)}
            />
          )}

          {activeTab === 'auditoria' && (
            <AuditoryView logs={state.auditLogs} />
          )}

        </div>

      </main>

      {/* Visual Modal Layer 1: Receipts Comprovante */}
      {activeReceipt && (
        <TransactionReceipt
          transaction={activeReceipt}
          category={state.categories.find(c => c.id === activeReceipt.categoryId)}
          box={state.boxes.find(b => b.id === activeReceipt.boxId)}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Visual Modal Layer 2: Official Closings Minutes */}
      {activeAta && (
        <AtaWeeklyClosing
          closing={activeAta}
          transactions={state.transactions}
          onClose={() => setActiveAta(null)}
        />
      )}

      {/* Institutional Legal Footer */}
      <footer className="bg-slate-900 text-slate-500 text-[10px] font-mono leading-normal text-center py-6 mt-12 border-t border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="font-semibold text-slate-400">Escola Bíblica Dominical (EBD) - Todos os direitos reservados © 2026</p>
          <p className="max-w-xl mx-auto leading-relaxed">
            Painel eletrônico integrado de auditoria financeira garantindo a contabilidade, visto e transparência institucional das lições CPAD e fundos gerais ordinários da escola bíblica.
          </p>
        </div>
      </footer>

    </div>
  );
}
