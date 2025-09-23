import { useContext } from 'react';

import ScreenMessage from './ScreenMessage.tsx';
import { AuthContext } from '../context/AuthContext.tsx';

const UnauthorizedComponent = () => {
  const { SignOut } = useContext(AuthContext);

  return (
    <ScreenMessage button={'Logout'} onClick={() => SignOut()}>
      {'401 Unauthorized - Your privileges has been revoked'}
    </ScreenMessage>
  );
};

export default UnauthorizedComponent;
