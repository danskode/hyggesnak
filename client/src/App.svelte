<script>
  import { Router, Route } from 'svelte-routing';
  import { Toaster } from 'svelte-sonner';
  import Home from './pages/Home/Home.svelte';
  import Members from './pages/Members/Members.svelte';
  import HyggesnakList from './pages/HyggesnakList/HyggesnakList.svelte';
  import CreateHyggesnak from './pages/CreateHyggesnak/CreateHyggesnak.svelte';
  import Chat from './pages/Chat/Chat.svelte';
  import Network from './pages/Network/Network.svelte';
  import AdminPanel from './pages/Admin/AdminPanel.svelte';
  import Login from './pages/Login/Login.svelte';
  import ForgotPassword from './pages/ForgotPassword/ForgotPassword.svelte';
  import ResetPassword from './pages/ResetPassword/ResetPassword.svelte';
  import PrivateRoute from './components/PrivateRoute.svelte';
  import AdminRoute from './components/AdminRoute.svelte';
  import Header from './components/Header.svelte';
  import Footer from './components/Footer.svelte';
</script>

<Toaster />

<Router>
  <Header />

  <main>
    <Route path='/'><Home /></Route>

    <!-- Legacy members route - redirects to hyggesnak-scoped route -->
    <Route path='/members'>
      <PrivateRoute>
        <Members />
      </PrivateRoute>
    </Route>

    <!-- Hyggesnak routes -->
    <Route path='/hyggesnakke'>
      <PrivateRoute>
        <HyggesnakList />
      </PrivateRoute>
    </Route>

    <Route path='/hyggesnakke/create'>
      <PrivateRoute>
        <CreateHyggesnak />
      </PrivateRoute>
    </Route>

    <!-- Network view -->
    <Route path='/network'>
      <PrivateRoute>
        <Network />
      </PrivateRoute>
    </Route>

    <!-- Hyggesnak-scoped chat route -->
    <Route path='/h/:hyggesnakId/chat'>
      <PrivateRoute>
        <Chat />
      </PrivateRoute>
    </Route>

    <!-- Hyggesnak-scoped members route -->
    <Route path='/h/:hyggesnakId/members'>
      <PrivateRoute>
        <Members />
      </PrivateRoute>
    </Route>

    <!-- Admin panel (SUPER_ADMIN only) -->
    <Route path='/admin'>
      <AdminRoute>
        <AdminPanel />
      </AdminRoute>
    </Route>

    <!-- Auth routes -->
    <Route path='/login'><Login /></Route>
    <Route path='/forgot-password'><ForgotPassword /></Route>
    <Route path='/reset-password'><ResetPassword /></Route>
  </main>

  <Footer />
</Router>
