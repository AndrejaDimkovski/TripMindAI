package travelmindai.com.mk.maintravelservice.security;

import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import travelmindai.com.mk.maintravelservice.repository.UserRepository;


@Service
public class DbUserDetailsService implements UserDetailsService {

    private final UserRepository users;

    public DbUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var u = users.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return User.withUsername(u.getUsername())
                .password(u.getPasswordHash())
                .roles("USER")
                .build();
    }
}
