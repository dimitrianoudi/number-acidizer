import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, Container } from '@chakra-ui/react'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider>
      <Container maxW="lg" py={16}>
        <App />
      </Container>
    </ChakraProvider>
  </React.StrictMode>
)
