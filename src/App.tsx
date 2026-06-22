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
  Menu, X, BookOpen, AlertCircle, ShieldCheck, Cloud, HelpCircle
} from 'lucide-react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  saveStateToFirestore,
  loadStateFromFirestore,
  GoogleAuthProvider,
  signInWithPopup
} from './lib/firebase';

// Import our modular subcomponents
import Dashboard from './components/Dashboard';
import BoxesManagement from './components/BoxesManagement';
import TransactionForm from './components/TransactionForm';
import WeeklyClosing from './components/WeeklyClosing';
import RegistrationManagement from './components/RegistrationManagement';
import ReportsView from './components/ReportsView';
import AuditoryView from './components/AuditoryView';
import UsersManagement from './components/UsersManagement';
import TransactionReceipt from './components/TransactionReceipt';
import AtaWeeklyClosing from './components/AtaWeeklyClosing';

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const initial = getInitialState();
    if (initial.users) {
      initial.users = initial.users.filter(u => !['usr1', 'usr2', 'usr3', 'usr4'].includes(u.id));
    }
    return initial;
  });
  
  // Login input fields
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Firebase Auth and Storage states
  const [loginMethod, setLoginMethod] = useState<'LOCAL' | 'FIREBASE'>('FIREBASE');
  const [firebaseEmail, setFirebaseEmail] = useState('');
  const [firebasePassword, setFirebasePassword] = useState('');
  const [firebaseAuthMode, setFirebaseAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [firebaseRole, setFirebaseRole] = useState<UserRole>('SECRETARIA');
  const [firebaseName, setFirebaseName] = useState('');
  const [syncingFirestore, setSyncingFirestore] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Google Authentication states
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showGoogleRoleModal, setShowGoogleRoleModal] = useState(false);
  const [showGoogleConfigGuide, setShowGoogleConfigGuide] = useState(false);
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

  // Sync state changes durably to Google Firestore if a Firebase User is logged in
  useEffect(() => {
    if (state.currentUser && state.currentUser.id.startsWith('fb-')) {
      const fbUserId = state.currentUser.id.replace('fb-', '');
      setSyncingFirestore(true);
      const timer = setTimeout(() => {
        saveStateToFirestore(fbUserId, state)
          .then(() => {
            setLastSyncedTime(new Date().toLocaleTimeString());
          })
          .catch(e => console.error("Erro ao sincronizar com Firestore:", e))
          .finally(() => {
            setSyncingFirestore(false);
          });
      }, 800); // debounce saves to prevent spamming
      return () => clearTimeout(timer);
    }
  }, [
    state.transactions, 
    state.boxes, 
    state.closings, 
    state.people, 
    state.categories, 
    state.auditLogs, 
    state.currentUser?.id
  ]);

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

  // Google Login click handler via Firebase Auth Popup
  const handleGoogleLoginClick = async () => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      
      if (fbUser) {
        setGoogleProfileData({
          id: `fb-${fbUser.uid}`,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Membro Google',
          email: fbUser.email || '',
          picture: fbUser.photoURL || ''
        });
        setShowGoogleRoleModal(true);
      }
    } catch (error: any) {
      console.error("Erro Google Sign-In via Firebase:", error);
      setLoginError(`Erro de Login Google: ${getFriendlyFirebaseError(error.code || error.message)}`);
    }
  };

  const handleConfirmGoogleRole = async (role: UserRole) => {
    if (!googleProfileData) return;
    
    setShowGoogleRoleModal(false);
    
    const updatedState = { ...state };
    const rawUid = googleProfileData.id.replace('fb-', '');
    
    try {
      const savedState = await loadStateFromFirestore(rawUid);
      if (savedState) {
        updatedState.boxes = savedState.boxes || updatedState.boxes;
        updatedState.categories = savedState.categories || updatedState.categories;
        updatedState.transactions = savedState.transactions || updatedState.transactions;
        updatedState.people = savedState.people || updatedState.people;
        updatedState.closings = savedState.closings || updatedState.closings;
        updatedState.auditLogs = savedState.auditLogs || updatedState.auditLogs;
        updatedState.users = savedState.users || updatedState.users;
      }
    } catch (err) {
      console.error("Erro ao sincronizar dados do Google Firestore:", err);
    }

    const emailLower = googleProfileData.email.toLowerCase().trim();
    let assignedRole = role;
    if (
      emailLower === 'vitorleonardoc@gmail.com' || 
      emailLower === 'vitorleonardocl@gmail.com' || 
      emailLower === 'vitorleonardocl@gmail.com.br'
    ) {
      assignedRole = 'MASTER';
    }

    updatedState.currentUser = {
      id: googleProfileData.id,
      name: googleProfileData.name,
      username: googleProfileData.email,
      role: assignedRole,
      avatarColor: assignedRole === 'MASTER' ? 'bg-indigo-900' : assignedRole === 'TESOUREIRO' ? 'bg-blue-600' : assignedRole === 'SECRETARIA' ? 'bg-indigo-600' : 'bg-emerald-600'
    };

    const isAlreadyInList = updatedState.users.some(u => u.username.toLowerCase().trim() === emailLower);
    if (!isAlreadyInList) {
      updatedState.users.push({
        id: googleProfileData.id,
        name: googleProfileData.name,
        username: googleProfileData.email,
        role: assignedRole,
        avatarColor: assignedRole === 'MASTER' ? 'bg-indigo-900' : assignedRole === 'TESOUREIRO' ? 'bg-blue-600' : assignedRole === 'SECRETARIA' ? 'bg-indigo-600' : 'bg-emerald-600'
      });
    }

    addAuditLog(updatedState, 'Login Google Concluido', `Acesso autenticado via Google Sign-In (${googleProfileData.email}) associado ao perfil ${assignedRole}.`, updatedState.currentUser);
    
    // Save to Firestore in a background promise so the UI transitions instantly and login never hangs
    saveStateToFirestore(rawUid, updatedState).catch(err => {
      console.error("Erro ao salvar dados novos do Google no Firestore:", err);
    });

    setState(updatedState);
    setGoogleProfileData(null);
    
    if (assignedRole === 'SECRETARIA') {
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

  // Firebase Auth integration handlers
  const handleFirebaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, firebaseEmail, firebasePassword);
      const fbUser = userCredential.user;
      
      // Load their previously synced state from Firestore or stick to local if empty
      const savedState = await loadStateFromFirestore(fbUser.uid);
      
      const updatedState = { ...state };
      
      if (savedState) {
        // Sync whole loaded collection
        updatedState.boxes = savedState.boxes || updatedState.boxes;
        updatedState.categories = savedState.categories || updatedState.categories;
        updatedState.transactions = savedState.transactions || updatedState.transactions;
        updatedState.people = savedState.people || updatedState.people;
        updatedState.closings = savedState.closings || updatedState.closings;
        updatedState.auditLogs = savedState.auditLogs || updatedState.auditLogs;
        updatedState.users = savedState.users || updatedState.users;
      }

      // Look for custom user metadata stored in state, or default role based on email/auth.
      let assignedRole: UserRole = 'DIRIGENTE'; // fallback
      let userDisplayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Membro';
      const emailLower = fbUser.email?.toLowerCase().trim() || '';

      if (
        emailLower === 'vitorleonardoc@gmail.com' || 
        emailLower === 'vitorleonardocl@gmail.com' || 
        emailLower === 'vitorleonardocl@gmail.com.br'
      ) {
        assignedRole = 'MASTER';
        userDisplayName = 'Vitor Leonardo';
      } else {
        const registeredUser = updatedState.users.find(u => u.username.toLowerCase() === emailLower);
        if (registeredUser) {
          assignedRole = registeredUser.role;
          userDisplayName = registeredUser.name;
        } else if (savedState && savedState.currentUser) {
          assignedRole = savedState.currentUser.role;
          userDisplayName = savedState.currentUser.name;
        } else {
          // Look up by email conventions or use DIRIGENTE as standard role
          if (fbUser.email?.includes('secretaria')) assignedRole = 'SECRETARIA';
          else if (fbUser.email?.includes('tesouraria') || fbUser.email?.includes('tesoureiro')) assignedRole = 'TESOUREIRO';
        }
      }

      updatedState.currentUser = {
        id: `fb-${fbUser.uid}`,
        name: userDisplayName,
        username: fbUser.email || '',
        role: assignedRole,
        avatarColor: assignedRole === 'MASTER' ? 'bg-indigo-900' : assignedRole === 'TESOUREIRO' ? 'bg-blue-600' : assignedRole === 'SECRETARIA' ? 'bg-indigo-600' : 'bg-emerald-600'
      };

      // Safeguard email is present in users array
      const hasSelfInUsers = updatedState.users.some(u => u.username.toLowerCase() === emailLower);
      if (!hasSelfInUsers) {
        updatedState.users.push({
          id: `fb-${fbUser.uid}`,
          name: userDisplayName,
          username: fbUser.email || '',
          role: assignedRole,
          avatarColor: assignedRole === 'MASTER' ? 'bg-indigo-900' : assignedRole === 'TESOUREIRO' ? 'bg-blue-600' : assignedRole === 'SECRETARIA' ? 'bg-indigo-600' : 'bg-emerald-600'
        });
      }

      addAuditLog(updatedState, 'Login Firebase', `Usuário ${userDisplayName} autenticado via Firebase Auth (${fbUser.email}).`, updatedState.currentUser);
      setState(updatedState);
      
      if (assignedRole === 'SECRETARIA') {
        setActiveTab('cadastro');
      } else {
        setActiveTab('dashboard');
      }
      
      setFirebaseEmail('');
      setFirebasePassword('');
    } catch (error: any) {
      console.error(error);
      setLoginError(`Erro de Autenticação Firebase: ${getFriendlyFirebaseError(error.code || error.message)}`);
    }
  };

  const handleFirebaseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (!firebaseEmail || !firebasePassword || !firebaseName) {
      setLoginError("Por favor, preencha todos os campos para se registrar no Firebase.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, firebaseEmail, firebasePassword);
      const fbUser = userCredential.user;
      
      const updatedState = { ...state };
      
      const emailLower = firebaseEmail.toLowerCase().trim();
      let assignedRole = firebaseRole;
      if (
        emailLower === 'vitorleonardoc@gmail.com' || 
        emailLower === 'vitorleonardocl@gmail.com' || 
        emailLower === 'vitorleonardocl@gmail.com.br'
      ) {
        assignedRole = 'MASTER';
      }

      // Store user object session
      updatedState.currentUser = {
        id: `fb-${fbUser.uid}`,
        name: firebaseName,
        username: firebaseEmail,
        role: assignedRole,
        avatarColor: assignedRole === 'MASTER' ? 'bg-indigo-900' : assignedRole === 'TESOUREIRO' ? 'bg-blue-600' : assignedRole === 'SECRETARIA' ? 'bg-indigo-600' : 'bg-emerald-600'
      };

      // Also register this user into our local system user directory
      const isAlreadyInList = updatedState.users.some(u => u.username.toLowerCase() === emailLower);
      if (!isAlreadyInList) {
        updatedState.users.push({
          id: `fb-${fbUser.uid}`,
          name: firebaseName,
          username: firebaseEmail,
          role: assignedRole,
          avatarColor: assignedRole === 'MASTER' ? 'bg-indigo-900' : assignedRole === 'TESOUREIRO' ? 'bg-blue-600' : assignedRole === 'SECRETARIA' ? 'bg-indigo-600' : 'bg-emerald-600'
        });
      }

      addAuditLog(updatedState, 'Registro Firebase', `Nova conta efetuada no Firebase Auth para ${firebaseName} (${firebaseEmail}) com cargo ${assignedRole}.`, updatedState.currentUser);
      
      // Save this initial state mapping immediately
      await saveStateToFirestore(fbUser.uid, updatedState);
      
      setState(updatedState);
      
      if (assignedRole === 'SECRETARIA') {
        setActiveTab('cadastro');
      } else {
        setActiveTab('dashboard');
      }

      // Reset fields
      setFirebaseEmail('');
      setFirebasePassword('');
      setFirebaseName('');
      setFirebaseAuthMode('LOGIN');
    } catch (error: any) {
      console.error(error);
      setLoginError(`Erro de Registro Firebase: ${getFriendlyFirebaseError(error.code || error.message)}`);
    }
  };

  const getFriendlyFirebaseError = (code: string) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'O endereço de e-mail fornecido é inválido.';
      case 'auth/user-disabled':
        return 'Este usuário foi desativado.';
      case 'auth/user-not-found':
        return 'Nenhum usuário correspondente encontrado.';
      case 'auth/wrong-password':
        return 'Senha incorreta fornecida.';
      case 'auth/email-already-in-use':
        return 'O e-mail fornecido já está em uso por outra conta.';
      case 'auth/weak-password':
        return 'A senha fornecida é muito fraca (pelo menos 6 caracteres).';
      case 'auth/invalid-credential':
        return 'Credenciais de acesso incorretas ou expiradas.';
      case 'auth/popup-closed-by-user':
        return 'O popup de autenticação do Google foi fechado antes de concluir o acesso. Isso pode ocorrer caso você feche a janela ou se o Provedor Google não estiver ativo no console do seu Firebase.';
      case 'auth/cancelled-popup-request':
        return 'A janela popup foi fechada pois outra tentativa de acesso concorrente foi iniciada.';
      case 'auth/operation-not-allowed':
        return 'O login com Google não foi ativado no painel de seu projeto Firebase. Ative-o em "Authentication" > "Sign-in method" no console do Firebase.';
      case 'auth/popup-blocked':
        return 'O popup de login do Google foi bloqueado pelo seu navegador. Habilite a exibição de popups para este site.';
      case 'auth/internal-error':
        return 'Ocorreu um erro interno de criptografia do Firebase. Verifique se o Google console está associado corretamente.';
      default:
        return code;
    }
  };

  // Logout handler
  const handleLogout = () => {
    const updatedState = { ...state };
    if (updatedState.currentUser) {
      addAuditLog(updatedState, 'Logout de Usuario', `Usuario ${updatedState.currentUser.name} encerrou a sessao.`);
    }

    // Sign out from Firebase Auth if logged in
    if (state.currentUser?.id.startsWith('fb-')) {
      firebaseSignOut(auth).catch(e => console.error("Erro logout Firebase:", e));
    }

    updatedState.currentUser = null;
    setState(updatedState);
    setUsernameInput('');
    setPasswordInput('');
    setFirebaseEmail('');
    setFirebasePassword('');
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

            {/* Firebase Auth section */}
            <div className="space-y-4 font-semibold text-xs animate-fade-in">
                {/* Firebase form mode toggle */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[9px] text-slate-400 font-bold uppercase">
                  <span>Modo Firebase</span>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => { setFirebaseAuthMode('LOGIN'); setLoginError(null); }}
                      className={`hover:text-indigo-600 transition-colors cursor-pointer ${firebaseAuthMode === 'LOGIN' ? 'text-indigo-600 font-black border-b border-indigo-600 pb-0.5' : ''}`}
                    >
                      Login
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setFirebaseAuthMode('REGISTER'); setLoginError(null); }}
                      className={`hover:text-indigo-600 transition-colors cursor-pointer ${firebaseAuthMode === 'REGISTER' ? 'text-indigo-600 font-black border-b border-indigo-600 pb-0.5' : ''}`}
                    >
                      Registrar
                    </button>
                  </div>
                </div>

                {firebaseAuthMode === 'LOGIN' ? (
                  <form onSubmit={handleFirebaseLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-600 uppercase tracking-widest block text-[10px]">E-mail Firebase</label>
                      <input
                        type="email"
                        required
                        value={firebaseEmail}
                        onChange={(e) => setFirebaseEmail(e.target.value)}
                        placeholder="seu-email@dominio.com"
                        className="block w-full border border-slate-200 rounded-xl p-3 sm:text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-650 uppercase tracking-widest block text-[10px]">Senha Firebase</label>
                      <input
                        type="password"
                        required
                        value={firebasePassword}
                        onChange={(e) => setFirebasePassword(e.target.value)}
                        placeholder="Mínimo de 6 caracteres"
                        className="block w-full border border-slate-200 rounded-xl p-3 sm:text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 text-white rounded-xl py-3.5 text-center font-bold text-xs shadow-md shadow-indigo-100 transition-all cursor-pointer active:scale-[0.98] mt-2 flex items-center justify-center gap-1.5"
                    >
                      <Cloud className="w-4 h-4" />
                      Acessar com Firebase
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleFirebaseRegister} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-slate-600 uppercase tracking-widest block text-[10px]">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={firebaseName}
                        onChange={(e) => setFirebaseName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="block w-full border border-slate-200 rounded-xl p-3 sm:text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 uppercase tracking-widest block text-[10px]">E-mail de Registro</label>
                      <input
                        type="email"
                        required
                        value={firebaseEmail}
                        onChange={(e) => setFirebaseEmail(e.target.value)}
                        placeholder="seu-email@dominio.com"
                        className="block w-full border border-slate-200 rounded-xl p-3 sm:text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 uppercase tracking-widest block text-[10px]">Senha de Acesso</label>
                      <input
                        type="password"
                        required
                        value={firebasePassword}
                        onChange={(e) => setFirebasePassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="block w-full border border-slate-200 rounded-xl p-3 sm:text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 uppercase tracking-widest block text-[10px]">Cargo Executivo EBD</label>
                      <select
                        value={firebaseRole}
                        onChange={(e) => setFirebaseRole(e.target.value as UserRole)}
                        className="block w-full border border-slate-200 rounded-xl p-3 sm:text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                      >
                        <option value="SECRETARIA">Secretária (Cadastros & Fluxos)</option>
                        <option value="TESOUREIRO">Tesoureiro (Saldos & Fechamento)</option>
                        <option value="DIRIGENTE">Dirigente (Auditoria Geral)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 text-white rounded-xl py-3 text-center font-bold text-xs shadow-md transition-all cursor-pointer active:scale-[0.98] mt-2 flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4 animation-pulse" />
                      Criar Conta Firebase
                    </button>
                  </form>
                )}
              </div>

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

            {/* Google Config Guide / Help */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setShowGoogleConfigGuide(!showGoogleConfigGuide)}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                id="toggle-guide-btn"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showGoogleConfigGuide ? 'Ocultar instruções de configuração' : 'Dica: Como habilitar o Google no meu Firebase?'}
              </button>
            </div>

            {showGoogleConfigGuide && (
              <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[10px] text-slate-650 leading-relaxed font-semibold transition-all animate-fade-in space-y-3 text-left">
                <div>
                  <p className="font-extrabold text-indigo-900 uppercase tracking-wider text-[9px] mb-1">1. Liberar Domínio de Acesso (Corrige "auth/unauthorized-domain"):</p>
                  <p className="font-medium text-slate-750 mb-1">O Firebase exige a homologação de quais domínios podem iniciar a autenticação por popup.</p>
                  <ol className="list-decimal list-inside space-y-1 font-medium text-slate-700">
                    <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-650 hover:underline font-bold">Firebase Console ↗</a> e abra o projeto <strong className="text-slate-800">financas-ebd</strong>.</li>
                    <li>No menu lateral esquerdo, vá em <strong className="text-slate-800">Authentication</strong>.</li>
                    <li>Clique na aba <strong className="text-slate-850">Settings</strong> (Configurações) no topo.</li>
                    <li>No menu esquerdo que aparecerá, selecione <strong className="text-slate-850">Authorized domains</strong> (Domínios autorizados).</li>
                    <li>Clique em <strong className="text-indigo-600">Add domain</strong> (Adicionar domínio) e registre os seguintes domínios do seu applet:
                      <ul className="list-disc list-inside ml-4 mt-1 text-slate-600 space-y-0.5 font-mono text-[9px]">
                        <li>ais-dev-yg7iuqllq2nwibcqkxsu43-520053391223.us-east1.run.app</li>
                        <li>ais-pre-yg7iuqllq2nwibcqkxsu43-520053391223.us-east1.run.app</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div className="border-t border-slate-200/50 pt-2">
                  <p className="font-extrabold text-indigo-900 uppercase tracking-wider text-[9px] mb-1">2. Vincular seu Firebase financas-ebd ao Código:</p>
                  <p className="font-medium text-slate-755 mb-1.5">Configure as variáveis de ambiente das credenciais Web do seu Firebase no menu <strong className="text-slate-800">Settings</strong> do AI Studio (ou em seu arquivo <code className="bg-slate-100 px-1 py-0.5 rounded text-[8px] font-mono font-bold">.env</code>):</p>
                  <ul className="space-y-1 font-mono text-[9px] text-slate-600 bg-slate-100/60 p-2 rounded-xl border border-slate-200/40">
                    <li>VITE_FIREBASE_API_KEY=<span className="text-indigo-600 font-bold">&lt;Sua_ApiKey_Web&gt;</span></li>
                    <li>VITE_FIREBASE_AUTH_DOMAIN=financas-ebd.firebaseapp.com</li>
                    <li>VITE_FIREBASE_PROJECT_ID=financas-ebd</li>
                    <li>VITE_FIREBASE_STORAGE_BUCKET=financas-ebd.firebasestorage.app</li>
                    <li>VITE_FIREBASE_MESSAGING_SENDER_ID=<span className="text-indigo-600 font-bold">&lt;Seu_Sender_ID&gt;</span></li>
                    <li>VITE_FIREBASE_APP_ID=<span className="text-indigo-600 font-bold">&lt;Seu_App_ID_Web&gt;</span></li>
                  </ul>
                </div>

                <div className="border-t border-slate-200/50 pt-2 text-[8px] text-slate-500 font-medium">
                  <strong>Nota:</strong> Ative também o provedor de login <strong className="text-slate-700">Google</strong> na aba "Sign-in method" em seu console do Firebase se ainda não tiver feito!
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                RBAC Ativo
              </span>
              <span>v1.2.0 • Versão de Avaliação</span>
            </div>
          </div>
        </div>

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

              {user.role === 'MASTER' && (
                <button
                  onClick={() => setActiveTab('usuarios')}
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1 ${
                    activeTab === 'usuarios' ? 'bg-slate-800 text-indigo-300' : 'text-slate-350 hover:bg-slate-800 hover:text-white'
                  }`}
                  id="tab-users-mgmt"
                >
                  <Users className="w-3.5 h-3.5" />
                  Usuários
                </button>
              )}
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
                {user.id.startsWith('fb-') && (
                  <div className="flex items-center gap-1.5 text-[9px] font-bold font-mono uppercase px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">
                    <Cloud className={`w-3 h-3 ${syncingFirestore ? 'animate-bounce text-indigo-400' : 'text-emerald-400'}`} />
                    <span>{syncingFirestore ? 'Salvando...' : lastSyncedTime ? `Nuvem Ok (${lastSyncedTime})` : 'Nuvem Ativa'}</span>
                  </div>
                )}

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

            {user.role === 'MASTER' && (
              <button
                onClick={() => { setActiveTab('usuarios'); setMobileMenuOpen(false); }}
                className={`block w-full text-left py-2 px-3 rounded-lg ${activeTab === 'usuarios' ? 'bg-slate-800 text-indigo-300' : 'text-slate-300'}`}
              >
                Gerenciar Usuários
              </button>
            )}

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

          {activeTab === 'usuarios' && user.role === 'MASTER' && (
            <UsersManagement
              users={state.users}
              currentUser={user}
              onUpdateUsersList={(updatedUsers) => {
                const updatedState = { ...state, users: updatedUsers };
                setState(updatedState);
              }}
              onLogAudit={(action, details) => {
                const updatedState = { ...state };
                addAuditLog(updatedState, action, details, user);
                setState(updatedState);
              }}
            />
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
