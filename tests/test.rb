require 'gmail'

l = ''
p = ''

def relative_labels_exist(login, password)
    Gmail.connect(login, password) do |gmail|
        puts "Logged in" if gmail.logged_in?
        gmail.labels.each do |label|
            puts label
        end
        gmail.logout
    end
end

relative_labels_exist(l, p)
