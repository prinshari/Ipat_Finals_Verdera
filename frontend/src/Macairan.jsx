import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Container, 
  Typography, 
  Button, 
  TextField, 
  Paper, 
  Box, 
  Alert,
  CircularProgress,
  Grid
} from "@mui/material";
import axios from 'axios';

const Balanag = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [userRole, setRole] = useState("");
  
  // Email form states
  const [formData, setFormData] = useState({ 
    to: '', 
    subject: '', 
    message: '' 
  });
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertType, setAlertType] = useState('info');

  useEffect(() => {
    // Retrieve the user and role from localStorage
    const storedUser = localStorage.getItem("username");
    const storedRole = localStorage.getItem("role");
    const storedToken = localStorage.getItem("token");

    console.log("Stored User:", storedUser);
    console.log("Stored Role:", storedRole);
    console.log("Stored Token:", storedToken ? "Token exists" : "No token found");

    if (storedUser && storedRole && storedToken) {
      setUser(storedUser);
      setRole(storedRole);

      // If the user is not admin1, redirect them
      if (storedRole !== "admin1") {
        console.log("Not Admin1, redirecting to admin2...");
        setTimeout(() => navigate("/admin2"), 0);
      }
    } else {
      console.log("No user, role, or token found, redirecting to login...");
      setTimeout(() => navigate("/login"), 0);
    }
  }, [navigate]);

  // Handle form input changes
  const handleChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    
    try {
      // Get the token from localStorage
      const token = localStorage.getItem("token");
      
      if (!token) {
        setResponse('No authentication token found. Please login again.');
        setAlertType('error');
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      console.log('Sending data:', formData);
      console.log('Using token:', token ? 'Token present' : 'No token');
      
      // Send request with Authorization header
      const res = await axios.post('http://localhost:5000/api/send-email', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response:', res.data);
      
      setResponse(res.data.message);
      setAlertType('success');
      
      // Clear form on success
      setFormData({ to: '', subject: '', message: '' });
      
    } catch (error) {
      console.error('Full error:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        const errorMessage = error.response.data.message || 'Server error occurred';
        
        // Handle authentication errors
        if (error.response.status === 401 || error.response.status === 403) {
          setResponse('Authentication failed. Please login again.');
          setAlertType('error');
          setTimeout(() => {
            localStorage.clear();
            navigate("/login");
          }, 2000);
        } else {
          setResponse(errorMessage);
          setAlertType('error');
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        setResponse('Cannot connect to server. Is the server running?');
        setAlertType('error');
      } else {
        console.error('Request setup error:', error.message);
        setResponse('Error setting up request');
        setAlertType('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear localStorage and redirect to login
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Header Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome {userRole} {user}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Admin1 Dashboard 
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleLogout}
              size="large"
            >
              Logout
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Email Form Section */}
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
          Send Email
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="to"
                type="email"
                label="Recipient Email"
                placeholder="Enter recipient's email address"
                value={formData.to}
                onChange={handleChange}
                required
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                name="subject"
                label="Subject"
                placeholder="Enter email subject"
                value={formData.subject}
                onChange={handleChange}
                required
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                name="message"
                label="Message"
                placeholder="Enter your message here..."
                value={formData.message}
                onChange={handleChange}
                required
                multiline
                rows={6}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
                sx={{ mt: 2 }}
              >
                {loading ? 'Sending...' : 'Send Email'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Response Alert */}
        {response && (
          <Box sx={{ mt: 3 }}>
            <Alert severity={alertType} onClose={() => setResponse('')}>
              {response}
            </Alert>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Balanag;